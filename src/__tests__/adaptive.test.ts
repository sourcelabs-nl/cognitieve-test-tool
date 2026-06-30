import { describe, it, expect } from 'vitest';
import {
  applyAnswer,
  createSession,
  levelForEstimate,
  nextLevel,
  MAX_ITEMS,
} from '../engine/adaptive';
import type { Item } from '../engine/types';

function fakeItem(level: number, correct: boolean): { item: Item; chosenIndex: number } {
  const item: Item = {
    id: `sim-${level}`,
    category: 'numeric',
    level,
    prompt: 'sim',
    options: ['a', 'b', 'c', 'd'],
    correctIndex: 0,
    explanation: '',
  };
  return { item, chosenIndex: correct ? 0 : 1 };
}

// Deterministische PRNG zodat de simulatie reproduceerbaar is.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// IRT-achtige kans op een goed antwoord: kandidaatvaardigheid theta versus
// itemniveau L. Bij theta == L is de kans 0.5.
function probCorrect(theta: number, level: number): number {
  return 1 / (1 + Math.exp(-1.7 * (theta - level)));
}

// Speelt een volledige sessie voor een kandidaat met vaardigheid theta.
function simulate(theta: number, seed: number): number {
  const rng = mulberry32(seed);
  let state = createSession('numeric', 'test');
  while (!state.finished) {
    const level = nextLevel(state);
    const correct = rng() < probCorrect(theta, level);
    const { item, chosenIndex } = fakeItem(level, correct);
    state = applyAnswer(state, { item, chosenIndex, responseMs: 8000 });
  }
  return state.estimate;
}

function average(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

describe('staircase-algoritme', () => {
  it('vertaalt schatting naar discreet niveau 1..5', () => {
    expect(levelForEstimate(1.0)).toBe(1);
    expect(levelForEstimate(2.4)).toBe(2);
    expect(levelForEstimate(2.6)).toBe(3);
    expect(levelForEstimate(5.0)).toBe(5);
    expect(levelForEstimate(7)).toBe(5);
  });

  it('altijd goed convergeert naar een hoog eindniveau', () => {
    let state = createSession('numeric', 'test');
    while (!state.finished) {
      const { item, chosenIndex } = fakeItem(nextLevel(state), true);
      state = applyAnswer(state, { item, chosenIndex, responseMs: 8000 });
    }
    expect(state.estimate).toBeGreaterThanOrEqual(4.5);
  });

  it('altijd fout convergeert naar het laagste niveau', () => {
    let state = createSession('numeric', 'test');
    while (!state.finished) {
      const { item, chosenIndex } = fakeItem(nextLevel(state), false);
      state = applyAnswer(state, { item, chosenIndex, responseMs: 8000 });
    }
    expect(state.estimate).toBeLessThanOrEqual(1.5);
  });

  it('stopt na maximaal MAX_ITEMS items', () => {
    let state = createSession('numeric', 'test');
    while (!state.finished) {
      const { item, chosenIndex } = fakeItem(nextLevel(state), true);
      state = applyAnswer(state, { item, chosenIndex, responseMs: 8000 });
    }
    expect(state.answers.length).toBeLessThanOrEqual(MAX_ITEMS);
  });

  it('sterke kandidaten eindigen hoger dan zwakke (gemiddeld over seeds)', () => {
    const seeds = Array.from({ length: 25 }, (_, i) => i + 1);
    const strong = average(seeds.map((s) => simulate(5, s)));
    const mid = average(seeds.map((s) => simulate(3, s)));
    const weak = average(seeds.map((s) => simulate(1, s)));

    expect(strong).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(weak);
    expect(strong - weak).toBeGreaterThan(1.5);
    expect(strong).toBeGreaterThan(3.5);
    expect(weak).toBeLessThan(2.5);
  });
});

// "Welke letter hoort niet in de rij?" staat of valt met eenduidigheid: er mag
// precies een letter zijn waarvan het vervangen de hele rij weer kloppend
// maakt. Deze test controleert dat met een eigen, onafhankelijk geschreven
// regelset, dus niet met de code van de generator.

import { describe, it, expect } from 'vitest';
import { buildLetterOddOne, generateLetters, safeLetterOddOne } from '../generators/letters';

const ALPHABET = 26;

function positionOf(letter: string): number {
  return letter.charCodeAt(0) - 65;
}

// Sprong vooruit modulo 26, zodat ook een rij die achteruit loopt of die via de
// omslag van Z naar A klopt netjes meegenomen wordt.
function jumps(positions: number[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < positions.length; i++) {
    result.push((positions[i] - positions[i - 1] + ALPHABET) % ALPHABET);
  }
  return result;
}

function constantJumps(positions: number[]): boolean {
  const j = jumps(positions);
  return j.every((value) => value === j[0]);
}

// De lezingen die een oplosser redelijkerwijs kan proberen. Bewust ruim: hoe
// meer lezingen, hoe strenger de eis dat er maar een plaats te repareren is.
function followsSomeRule(positions: number[]): boolean {
  const j = jumps(positions);
  const n = j.length;

  // Vaste sprong.
  if (constantJumps(positions)) return true;

  // Sprong die elke keer even veel verandert.
  if (n >= 3) {
    const change = (j[1] - j[0] + ALPHABET) % ALPHABET;
    let ok = true;
    for (let i = 0; i < n; i++) {
      if (j[i] !== (j[0] + i * change) % ALPHABET) ok = false;
    }
    if (ok) return true;
  }

  // Twee sprongen die elkaar afwisselen.
  if (n >= 4) {
    let ok = true;
    for (let i = 0; i < n; i++) if (j[i] !== j[i % 2]) ok = false;
    if (ok) return true;
  }

  // Drie sprongen die zich herhalen.
  if (n >= 5) {
    let ok = true;
    for (let i = 0; i < n; i++) if (j[i] !== j[i % 3]) ok = false;
    if (ok) return true;
  }

  // Twee verweven reeksen met elk een vaste sprong.
  const even = positions.filter((_, i) => i % 2 === 0);
  const odd = positions.filter((_, i) => i % 2 === 1);
  if (even.length >= 3 && odd.length >= 3 && constantJumps(even) && constantJumps(odd)) return true;

  // Elke sprong is de som van de twee vorige.
  if (n >= 4) {
    let ok = true;
    for (let i = 2; i < n; i++) if (j[i] !== (j[i - 1] + j[i - 2]) % ALPHABET) ok = false;
    if (ok) return true;
  }

  // Elke sprong is het dubbele van de vorige.
  if (n >= 3) {
    let ok = true;
    for (let i = 1; i < n; i++) if (j[i] !== (2 * j[i - 1]) % ALPHABET) ok = false;
    if (ok) return true;
  }

  return false;
}

// Alle plaatsen waarvan het vervangen door een andere letter de rij kloppend
// maakt.
function repairablePositions(tokens: string[]): number[] {
  const positions = tokens.map(positionOf);
  const result: number[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let value = 0; value < ALPHABET; value++) {
      if (value === positions[i]) continue;
      const candidate = [...positions];
      candidate[i] = value;
      if (followsSomeRule(candidate)) {
        result.push(i);
        break;
      }
    }
  }
  return result;
}

function expectUniqueOddOne(tokens: string[], answer: string): void {
  // De rij zoals hij getoond wordt volgt zelf geen enkele regel; anders is er
  // geen letter die er niet bij hoort.
  expect(followsSomeRule(tokens.map(positionOf))).toBe(false);
  const repairable = repairablePositions(tokens);
  expect(repairable).toHaveLength(1);
  expect(tokens[repairable[0]]).toBe(answer);
  // Alle getoonde letters verschillen, zodat een optie een unieke plaats aanwijst.
  expect(new Set(tokens).size).toBe(tokens.length);
}

const LEVELS = [3, 4, 5, 6];

describe('welke letter hoort niet in de rij', () => {
  for (const level of LEVELS) {
    it(`niveau ${level}: precies een letter breekt de regel (300 trekkingen)`, () => {
      for (let i = 0; i < 300; i++) {
        const odd = buildLetterOddOne(level);
        expect(odd.tokens.length).toBeGreaterThanOrEqual(6);
        expectUniqueOddOne(odd.tokens, odd.answer);
        // De bedorven letter staat nooit op de eerste twee of de laatste plaats.
        expect(odd.brokenIndex).toBeGreaterThanOrEqual(2);
        expect(odd.brokenIndex).toBeLessThanOrEqual(odd.tokens.length - 2);
        // De afleiders zijn andere letters uit de getoonde rij.
        expect(odd.distractors).toHaveLength(3);
        for (const distractor of odd.distractors) {
          expect(odd.tokens).toContain(distractor);
          expect(distractor).not.toBe(odd.answer);
        }
        expect(new Set(odd.distractors).size).toBe(3);
        expect(odd.explanation).toContain(odd.answer);
        expect(odd.hint.length).toBeGreaterThan(40);
        expect(odd.hint).not.toBe(odd.explanation);
      }
    });
  }

  for (const level of LEVELS) {
    it(`niveau ${level}: meerdere regels als basis (variatie)`, () => {
      const seen = new Set<string>();
      for (let i = 0; i < 300; i++) seen.add(buildLetterOddOne(level).baseFamily);
      expect(seen.size).toBeGreaterThanOrEqual(2);
    });
  }

  it('de terugval levert ook een eenduidige opgave', () => {
    const odd = safeLetterOddOne();
    expectUniqueOddOne(odd.tokens, odd.answer);
  });

  it('alle vier de opties komen uit de getoonde rij', () => {
    for (const level of LEVELS) {
      let seen = 0;
      for (let i = 0; i < 400 && seen < 40; i++) {
        const item = generateLetters(level);
        if (item.form !== 'letterOddOne') continue;
        seen += 1;
        const tokens = item.prompt.split('\n\n')[1].split(', ');
        expect(item.options).toHaveLength(4);
        for (const option of item.options) expect(tokens).toContain(option);
        expectUniqueOddOne(tokens, item.options[item.correctIndex]);
      }
      expect(seen).toBeGreaterThan(0);
    }
  });

  // Ongeveer een op de vijf items vanaf niveau 3; de reeksen blijven dus de
  // hoofdmoot. Op niveau 1 en 2 komt de vorm helemaal niet voor.
  it('de vorm verdringt de reeksen niet', () => {
    for (const level of [1, 2]) {
      for (let i = 0; i < 300; i++) expect(generateLetters(level).form).toBe('letterSeries');
    }
    for (const level of LEVELS) {
      let oddOnes = 0;
      const draws = 2000;
      for (let i = 0; i < draws; i++) {
        if (generateLetters(level).form === 'letterOddOne') oddOnes += 1;
      }
      expect(oddOnes / draws).toBeGreaterThan(0.13);
      expect(oddOnes / draws).toBeLessThan(0.27);
    }
  });
});

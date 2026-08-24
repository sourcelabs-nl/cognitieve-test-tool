import { describe, it, expect } from 'vitest';
import { MAX_LEVEL } from '../engine/types';
import {
  buildLetterSeries,
  generateLetters,
  letterAt,
  type LetterFamily,
  type LetterSeries,
} from '../generators/letters';

const ALL_FAMILIES: LetterFamily[] = [
  'step',
  'changingStep',
  'alternating',
  'zigzag',
  'interwoven',
  'interwovenTriple',
  'mirror',
  'pairs',
  'pairsMirror',
  'pairsChanging',
  'doublingStep',
  'primePositions',
  'fibStep',
];

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];

function idx(letter: string): number {
  return letter.charCodeAt(0) - 65;
}

// Voorwaartse stap modulo 26 tussen twee letterposities. Alle stappen in de
// generator zijn kleiner dan 26, dus dit verschil is eenduidig, ook wanneer de
// reeks achteruit loopt (een stap van -3 leest als +23).
function fdiff(a: number, b: number): number {
  return (((b - a) % 26) + 26) % 26;
}

function forwardDiffs(positions: number[]): number[] {
  return positions.slice(1).map((p, i) => fdiff(positions[i], p));
}

function normalise(index: number): number {
  return ((index % 26) + 26) % 26;
}

// Leidt de verwachte volgende letter onafhankelijk af uit de zichtbare reeks.
// De assertions controleren tegelijk dat de reeks echt bij die familie hoort.
function expectedAnswer(series: LetterSeries): string {
  const { family, tokens } = series;

  if (family === 'pairsChanging') {
    // De eerste letters versnellen (constant tweede verschil), de tweede
    // letters houden een vaste stap.
    const firsts = tokens.map((t) => idx(t[0]));
    const seconds = tokens.map((t) => idx(t[1]));
    const firstDiffs = forwardDiffs(firsts);
    const increments = firstDiffs.slice(1).map((d, i) => d - firstDiffs[i]);
    for (const inc of increments) expect(inc).toBe(increments[0]);
    expect(increments[0]).toBeGreaterThan(0);
    const secondDiffs = forwardDiffs(seconds);
    for (const d of secondDiffs) expect(d).toBe(secondDiffs[0]);
    const nextFirst = firsts[4] + firstDiffs[3] + increments[0];
    return letterAt(nextFirst) + letterAt(seconds[4] + secondDiffs[0]);
  }

  if (family === 'pairs' || family === 'pairsMirror') {
    // Beide letters van het paar vormen elk een eigen reeks met vaste stap.
    const firsts = tokens.map((t) => idx(t[0]));
    const seconds = tokens.map((t) => idx(t[1]));
    for (const positions of [firsts, seconds]) {
      const diffs = forwardDiffs(positions);
      for (const d of diffs) expect(d).toBe(diffs[0]);
    }
    const nextFirst = firsts[4] + fdiff(firsts[3], firsts[4]);
    const nextSecond = seconds[4] + fdiff(seconds[3], seconds[4]);
    return letterAt(nextFirst) + letterAt(nextSecond);
  }

  const p = tokens.map(idx);
  const last = p[p.length - 1];

  if (family === 'step') {
    const diffs = forwardDiffs(p);
    for (const d of diffs) expect(d).toBe(diffs[0]);
    return letterAt(last + diffs[0]);
  }

  if (family === 'changingStep' || family === 'fibStep') {
    const diffs = forwardDiffs(p);
    if (family === 'changingStep') {
      // Constant tweede verschil.
      const second = diffs.slice(1).map((d, i) => d - diffs[i]);
      for (const d of second) expect(d).toBe(second[0]);
      return letterAt(last + diffs[3] + second[0]);
    }
    // Elke stap is de som van de twee vorige stappen.
    expect(diffs[2]).toBe(diffs[0] + diffs[1]);
    expect(diffs[3]).toBe(diffs[1] + diffs[2]);
    return letterAt(last + diffs[2] + diffs[3]);
  }

  if (family === 'doublingStep') {
    const diffs = forwardDiffs(p);
    for (let i = 1; i < diffs.length; i++) expect(diffs[i]).toBe(diffs[i - 1] * 2);
    return letterAt(last + diffs[3] * 2);
  }

  if (family === 'primePositions') {
    // De plaatsen in het alfabet (1-gebaseerd) zijn opeenvolgende priemgetallen.
    const values = p.map((position) => position + 1);
    const start = PRIMES.indexOf(values[0]);
    expect(start).toBeGreaterThanOrEqual(0);
    values.forEach((value, i) => expect(value).toBe(PRIMES[start + i]));
    return letterAt(PRIMES[start + 5] - 1);
  }

  if (family === 'alternating' || family === 'zigzag') {
    const diffs = forwardDiffs(p);
    expect(diffs[2]).toBe(diffs[0]);
    expect(diffs[3]).toBe(diffs[1]);
    return letterAt(last + diffs[0]);
  }

  if (family === 'interwovenTriple') {
    // Reeks A staat op de posities 0, 3 en 6.
    const stepA = fdiff(p[0], p[3]);
    expect(fdiff(p[3], p[6])).toBe(stepA);
    return letterAt(p[6] + stepA);
  }

  // interwoven en mirror: reeks A staat op de posities 0, 2 en 4.
  const stepA = fdiff(p[0], p[2]);
  expect(fdiff(p[2], p[4])).toBe(stepA);
  return letterAt(p[4] + stepA);
}

describe('letterpatronen-generator', () => {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    it(`niveau ${level}: opgegeven antwoord klopt met onafhankelijke afleiding (300 trekkingen)`, () => {
      for (let i = 0; i < 300; i++) {
        const series = buildLetterSeries(level);
        expect(series.answer).toBe(expectedAnswer(series));
      }
    });
  }

  for (let level = 1; level <= MAX_LEVEL; level++) {
    it(`niveau ${level}: item heeft 4 unieke opties met het juiste antwoord (300 trekkingen)`, () => {
      for (let i = 0; i < 300; i++) {
        const item = generateLetters(level);
        expect(item.options).toHaveLength(4);
        expect(new Set(item.options).size).toBe(4);
        expect(item.correctIndex).toBeGreaterThanOrEqual(0);
        expect(item.correctIndex).toBeLessThan(4);
        expect(item.explanation.length).toBeGreaterThan(0);
        // Alle opties hebben dezelfde vorm als het juiste antwoord.
        const expectedLength = item.options[item.correctIndex].length;
        for (const option of item.options) {
          expect(/^[A-Z]{1,2}$/.test(option)).toBe(true);
          expect(option).toHaveLength(expectedLength);
        }
      }
    });
  }

  it('elke verwachte familie komt voor in de generator', () => {
    const seen = new Set<LetterFamily>();
    for (let level = 1; level <= MAX_LEVEL; level++) {
      for (let i = 0; i < 500; i++) seen.add(buildLetterSeries(level).family);
    }
    for (const family of ALL_FAMILIES) expect(seen.has(family)).toBe(true);
  });

  it('elk niveau biedt meerdere families (variatie tegen herhaling)', () => {
    const minimum: Record<number, number> = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 6 };
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const seen = new Set<LetterFamily>();
      for (let i = 0; i < 500; i++) seen.add(buildLetterSeries(level).family);
      expect(seen.size).toBeGreaterThanOrEqual(minimum[level]);
    }
  });

  it('reeksen blijven zoveel mogelijk binnen A..Z zonder omslag', () => {
    // Op niveau 1 en 2 zijn de stappen klein genoeg om altijd te passen; daar
    // mag de gebruiker nooit met een omslag van Z naar A geconfronteerd worden.
    for (const level of [1, 2]) {
      for (let i = 0; i < 300; i++) {
        const series = buildLetterSeries(level);
        expect(series.explanation).not.toContain('na Z begint het alfabet');
      }
    }
  });

  it('letterAt loopt netjes rond bij negatieve en grote posities', () => {
    expect(letterAt(0)).toBe('A');
    expect(letterAt(25)).toBe('Z');
    expect(letterAt(26)).toBe('A');
    expect(letterAt(-1)).toBe('Z');
    expect(normalise(-27)).toBe(25);
  });
});

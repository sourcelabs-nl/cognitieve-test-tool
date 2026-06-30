import { describe, it, expect } from 'vitest';
import { buildLetterSeries, generateLetters, letterAt } from '../generators/letters';

function idx(letter: string): number {
  return letter.charCodeAt(0) - 65;
}

// Voorwaartse stap modulo 26 tussen twee letterposities.
function fdiff(a: number, b: number): number {
  return ((b - a) % 26 + 26) % 26;
}

// Leidt de verwachte volgende letter-index onafhankelijk af uit de zichtbare
// letters. Stappen zijn klein (< 26), dus modulo-26 verschillen zijn eenduidig.
function expectedNextIndex(level: number, letters: string[]): number {
  const p = letters.map(idx);
  const last = p[p.length - 1];
  if (level === 1) {
    const d = fdiff(p[0], p[1]);
    for (let i = 1; i < p.length; i++) expect(fdiff(p[i - 1], p[i])).toBe(d);
    return last + d;
  }
  if (level === 2) {
    const diffs = p.slice(1).map((x, i) => fdiff(p[i], x));
    const e = diffs[1] - diffs[0];
    for (let i = 1; i < diffs.length; i++) expect(diffs[i] - diffs[i - 1]).toBe(e);
    return p[4] + diffs[diffs.length - 1] + e;
  }
  if (level === 3) {
    const sA = fdiff(p[0], p[2]);
    expect(fdiff(p[2], p[4])).toBe(sA);
    return p[4] + sA;
  }
  if (level === 4) {
    const sA = fdiff(p[0], p[1]);
    const sB = fdiff(p[1], p[2]);
    expect(fdiff(p[2], p[3])).toBe(sA);
    expect(fdiff(p[3], p[4])).toBe(sB);
    return p[4] + sA; // volgende stap is opnieuw sA
  }
  // niveau 5: voorwaartse reeks (oneven posities) verweven met achterwaartse
  const sF = fdiff(p[0], p[2]);
  expect(fdiff(p[2], p[4])).toBe(sF);
  return p[4] + sF;
}

describe('letterpatronen-generator', () => {
  for (let level = 1; level <= 5; level++) {
    it(`niveau ${level}: opgegeven antwoord klopt met onafhankelijke afleiding (100 trekkingen)`, () => {
      for (let i = 0; i < 100; i++) {
        const series = buildLetterSeries(level);
        const expected = ((expectedNextIndex(level, series.letters) % 26) + 26) % 26;
        const actual = ((series.answerIndex % 26) + 26) % 26;
        expect(letterAt(actual)).toBe(letterAt(expected));
      }
    });
  }

  for (let level = 1; level <= 5; level++) {
    it(`niveau ${level}: item heeft 4 unieke letteropties met het juiste antwoord (100 trekkingen)`, () => {
      for (let i = 0; i < 100; i++) {
        const item = generateLetters(level);
        expect(item.options).toHaveLength(4);
        expect(new Set(item.options).size).toBe(4);
        expect(item.correctIndex).toBeGreaterThanOrEqual(0);
        expect(item.correctIndex).toBeLessThan(4);
        expect(/^[A-Z]$/.test(item.options[item.correctIndex])).toBe(true);
        expect(item.explanation.length).toBeGreaterThan(0);
      }
    });
  }
});

import { describe, it, expect } from 'vitest';
import {
  buildNumericSeries,
  generateNumeric,
  type NumericFamily,
} from '../generators/numeric';

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

// Leidt de verwachte volgende term onafhankelijk af uit de zichtbare termen,
// op basis van de opgegeven familie. De assertions controleren bovendien dat
// de reeks daadwerkelijk bij die familie hoort (didactisch eenduidig).
function expectedNext(family: NumericFamily, terms: number[]): number {
  const last = terms[terms.length - 1];

  if (family === 'arithmetic') {
    const d = terms[1] - terms[0];
    for (let i = 1; i < terms.length; i++) expect(terms[i] - terms[i - 1]).toBe(d);
    return last + d;
  }

  if (family === 'geometric') {
    const r = terms[1] / terms[0];
    expect(Number.isInteger(r)).toBe(true);
    for (let i = 1; i < terms.length; i++) expect(terms[i]).toBe(terms[i - 1] * r);
    return last * r;
  }

  if (family === 'arithmetic2') {
    const diffs = terms.slice(1).map((t, i) => t - terms[i]);
    const e = diffs[1] - diffs[0];
    for (let i = 1; i < diffs.length; i++) expect(diffs[i] - diffs[i - 1]).toBe(e);
    return last + diffs[diffs.length - 1] + e;
  }

  if (family === 'interwoven') {
    const odd = [terms[0], terms[2], terms[4]];
    const sA = odd[1] - odd[0];
    expect(odd[2] - odd[1]).toBe(sA);
    return odd[2] + sA;
  }

  if (family === 'doublingPlus') {
    const m = (terms[2] - terms[1]) / (terms[1] - terms[0]);
    const c = terms[1] - terms[0] * m;
    expect(Number.isInteger(m)).toBe(true);
    for (let i = 1; i < terms.length; i++) expect(terms[i]).toBe(terms[i - 1] * m + c);
    return last * m + c;
  }

  if (family === 'altops') {
    const m = terms[1] / terms[0];
    const a = terms[2] - terms[1];
    expect(terms[3]).toBe(terms[2] * m);
    expect(terms[4]).toBe(terms[3] + a);
    return last * m; // volgende bewerking is opnieuw vermenigvuldigen
  }

  // special: kwadraten, derdemachten, Fibonacci of priemgetallen
  const roots2 = terms.map((t) => Math.round(Math.sqrt(t)));
  if (terms.every((t, i) => roots2[i] ** 2 === t && (i === 0 || roots2[i] === roots2[i - 1] + 1))) {
    return (roots2[roots2.length - 1] + 1) ** 2;
  }
  const roots3 = terms.map((t) => Math.round(Math.cbrt(t)));
  if (terms.every((t, i) => roots3[i] ** 3 === t && (i === 0 || roots3[i] === roots3[i - 1] + 1))) {
    return (roots3[roots3.length - 1] + 1) ** 3;
  }
  if (terms.slice(2).every((t, i) => t === terms[i] + terms[i + 1])) {
    return terms[terms.length - 1] + terms[terms.length - 2];
  }
  expect(terms.every(isPrime)).toBe(true);
  let next = last + 1;
  while (!isPrime(next)) next++;
  return next;
}

describe('cijferpatronen-generator', () => {
  for (let level = 1; level <= 5; level++) {
    it(`niveau ${level}: opgegeven antwoord klopt voor elke strategie (300 trekkingen)`, () => {
      for (let i = 0; i < 300; i++) {
        const series = buildNumericSeries(level);
        expect(series.answer).toBe(expectedNext(series.family, series.terms));
      }
    });
  }

  for (let level = 1; level <= 5; level++) {
    it(`niveau ${level}: item heeft 4 unieke opties met het juiste antwoord (200 trekkingen)`, () => {
      for (let i = 0; i < 200; i++) {
        const item = generateNumeric(level);
        expect(item.options).toHaveLength(4);
        expect(new Set(item.options).size).toBe(4);
        expect(item.correctIndex).toBeGreaterThanOrEqual(0);
        expect(item.correctIndex).toBeLessThan(4);
        expect(item.explanation.length).toBeGreaterThan(0);
        expect(Number.isNaN(Number(item.options[item.correctIndex]))).toBe(false);
      }
    });
  }

  it('elke verwachte familie komt voor in de generator', () => {
    const seen = new Set<NumericFamily>();
    for (let level = 1; level <= 5; level++) {
      for (let i = 0; i < 300; i++) seen.add(buildNumericSeries(level).family);
    }
    for (const fam of ['arithmetic', 'geometric', 'arithmetic2', 'interwoven', 'doublingPlus', 'altops', 'special'] as const) {
      expect(seen.has(fam)).toBe(true);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { MAX_LEVEL } from '../engine/types';
import {
  buildNumericSeries,
  generateNumeric,
  type NumericFamily,
} from '../generators/numeric';

const ALL_FAMILIES: NumericFamily[] = [
  'arithmetic',
  'geometric',
  'divide',
  'arithmetic2',
  'zigzag',
  'interwoven',
  'interwoven3',
  'interwovengeo',
  'geodiff',
  'products',
  'tribonacci',
  'fibminus',
  'recursive',
  'altops',
  'altmuldiv',
  'squares',
  'cubes',
  'powers',
  'fibonacci',
  'primes',
];

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

// Opeenvolgende verschillen van een rij.
function diffs(values: number[]): number[] {
  return values.slice(1).map((v, i) => v - values[i]);
}

// Leidt de verwachte volgende term onafhankelijk af uit de zichtbare termen,
// op basis van de opgegeven familie. De assertions controleren bovendien dat
// de reeks daadwerkelijk bij die familie hoort (didactisch eenduidig).
function expectedNext(family: NumericFamily, terms: number[]): number {
  const last = terms[terms.length - 1];
  const d1 = diffs(terms);

  if (family === 'arithmetic') {
    for (const d of d1) expect(d).toBe(d1[0]);
    return last + d1[0];
  }

  if (family === 'geometric') {
    const r = terms[1] / terms[0];
    expect(Number.isInteger(r)).toBe(true);
    for (let i = 1; i < terms.length; i++) expect(terms[i]).toBe(terms[i - 1] * r);
    return last * r;
  }

  if (family === 'divide') {
    const r = terms[0] / terms[1];
    expect(Number.isInteger(r)).toBe(true);
    for (let i = 1; i < terms.length; i++) expect(terms[i - 1]).toBe(terms[i] * r);
    expect(Number.isInteger(last / r)).toBe(true);
    return last / r;
  }

  if (family === 'arithmetic2') {
    const d2 = diffs(d1);
    for (const d of d2) expect(d).toBe(d2[0]);
    return last + d1[d1.length - 1] + d2[0];
  }

  if (family === 'zigzag') {
    // Stappen wisselen om en om: +up, -down, +up, -down.
    expect(d1[0]).toBeGreaterThan(0);
    expect(d1[1]).toBeLessThan(0);
    expect(d1[2]).toBe(d1[0]);
    expect(d1[3]).toBe(d1[1]);
    return last + d1[0];
  }

  if (family === 'interwoven') {
    const seriesA = [terms[0], terms[2], terms[4]];
    const stepA = seriesA[1] - seriesA[0];
    expect(seriesA[2] - seriesA[1]).toBe(stepA);
    const seriesB = [terms[1], terms[3], terms[5]];
    const stepB = seriesB[1] - seriesB[0];
    expect(seriesB[2] - seriesB[1]).toBe(stepB);
    return seriesA[2] + stepA; // het gevraagde getal hoort bij reeks A
  }

  if (family === 'interwoven3') {
    // Drie reeksen door elkaar: elke derde term hoort bij dezelfde reeks.
    for (let offset = 0; offset < 3; offset++) {
      const series = [terms[offset], terms[offset + 3], terms[offset + 6]];
      expect(series[2] - series[1]).toBe(series[1] - series[0]);
    }
    const seriesA = [terms[0], terms[3], terms[6]];
    return seriesA[2] + (seriesA[1] - seriesA[0]); // het gevraagde getal hoort bij reeks A
  }

  if (family === 'interwovengeo') {
    // Reeks A (oneven posities) vermenigvuldigt, reeks B (even posities) telt op.
    const seriesA = [terms[0], terms[2], terms[4]];
    const ratio = seriesA[1] / seriesA[0];
    expect(Number.isInteger(ratio)).toBe(true);
    expect(seriesA[2]).toBe(seriesA[1] * ratio);
    const seriesB = [terms[1], terms[3], terms[5]];
    expect(seriesB[2] - seriesB[1]).toBe(seriesB[1] - seriesB[0]);
    return seriesA[2] * ratio;
  }

  if (family === 'geodiff') {
    // De verschillen hebben zelf een vaste factor.
    const ratio = d1[1] / d1[0];
    expect(Number.isInteger(ratio)).toBe(true);
    for (let i = 1; i < d1.length; i++) expect(d1[i]).toBe(d1[i - 1] * ratio);
    return last + d1[d1.length - 1] * ratio;
  }

  if (family === 'products') {
    // Elke term is k x (k+1) voor opeenvolgende k.
    const factorOf = (value: number): number => Math.round((Math.sqrt(4 * value + 1) - 1) / 2);
    const factors = terms.map(factorOf);
    for (let i = 0; i < terms.length; i++) {
      expect(factors[i] * (factors[i] + 1)).toBe(terms[i]);
      if (i > 0) expect(factors[i]).toBe(factors[i - 1] + 1);
    }
    const n = factors[factors.length - 1] + 1;
    return n * (n + 1);
  }

  if (family === 'tribonacci') {
    for (let i = 3; i < terms.length; i++) {
      expect(terms[i]).toBe(terms[i - 1] + terms[i - 2] + terms[i - 3]);
    }
    return terms[2] + terms[3] + last;
  }

  if (family === 'fibminus') {
    for (let i = 2; i < terms.length; i++) expect(terms[i]).toBe(terms[i - 1] - terms[i - 2]);
    return last - terms[terms.length - 2];
  }

  if (family === 'recursive') {
    const m = (terms[2] - terms[1]) / (terms[1] - terms[0]);
    const c = terms[1] - terms[0] * m;
    expect(Number.isInteger(m)).toBe(true);
    for (let i = 1; i < terms.length; i++) expect(terms[i]).toBe(terms[i - 1] * m + c);
    return last * m + c;
  }

  if (family === 'altops') {
    const m = terms[1] / terms[0];
    const a = terms[2] - terms[1];
    expect(Number.isInteger(m)).toBe(true);
    expect(terms[3]).toBe(terms[2] * m);
    expect(terms[4]).toBe(terms[3] + a);
    return last * m; // volgende bewerking is opnieuw vermenigvuldigen
  }

  if (family === 'altmuldiv') {
    // Afwisselend x m en : d, met m groter dan d zodat de reeks netto groeit.
    const m = terms[1] / terms[0];
    const d = terms[1] / terms[2];
    expect(Number.isInteger(m)).toBe(true);
    expect(Number.isInteger(d)).toBe(true);
    expect(m).toBeGreaterThan(d);
    expect(terms[3]).toBe(terms[2] * m);
    expect(terms[4]).toBe(terms[3] / d);
    return last * m; // volgende bewerking is opnieuw vermenigvuldigen
  }

  if (family === 'squares') {
    // Kwadraten (eventueel verschoven) hebben een constant tweede verschil van 2.
    const d2 = diffs(d1);
    for (const d of d2) expect(d).toBe(2);
    return last + d1[d1.length - 1] + 2;
  }

  if (family === 'cubes') {
    // Derdemachten hebben een constant derde verschil van 6.
    const d2 = diffs(d1);
    const d3 = diffs(d2);
    for (const d of d3) expect(d).toBe(6);
    const nextD2 = d2[d2.length - 1] + 6;
    return last + d1[d1.length - 1] + nextD2;
  }

  if (family === 'powers') {
    // Bij b^n + c groeien de verschillen zelf met factor b.
    const base = d1[1] / d1[0];
    expect(Number.isInteger(base)).toBe(true);
    for (let i = 1; i < d1.length; i++) expect(d1[i]).toBe(d1[i - 1] * base);
    return last + d1[d1.length - 1] * base;
  }

  if (family === 'fibonacci') {
    for (let i = 2; i < terms.length; i++) expect(terms[i]).toBe(terms[i - 1] + terms[i - 2]);
    return terms[terms.length - 2] + last;
  }

  expect(terms.every(isPrime)).toBe(true);
  let next = last + 1;
  while (!isPrime(next)) next++;
  return next;
}

describe('cijferpatronen-generator', () => {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    it(`niveau ${level}: opgegeven antwoord klopt voor elke strategie (500 trekkingen)`, () => {
      for (let i = 0; i < 500; i++) {
        const series = buildNumericSeries(level);
        expect(series.answer).toBe(expectedNext(series.family, series.terms));
      }
    });
  }

  for (let level = 1; level <= MAX_LEVEL; level++) {
    it(`niveau ${level}: item heeft 4 unieke opties met het juiste antwoord (300 trekkingen)`, () => {
      for (let i = 0; i < 300; i++) {
        const item = generateNumeric(level);
        expect(item.options).toHaveLength(4);
        expect(new Set(item.options).size).toBe(4);
        expect(item.correctIndex).toBeGreaterThanOrEqual(0);
        expect(item.correctIndex).toBeLessThan(4);
        expect(item.explanation.length).toBeGreaterThan(0);
        for (const option of item.options) expect(Number.isNaN(Number(option))).toBe(false);
      }
    });
  }

  it('elke verwachte familie komt voor in de generator', () => {
    const seen = new Set<NumericFamily>();
    for (let level = 1; level <= MAX_LEVEL; level++) {
      for (let i = 0; i < 500; i++) seen.add(buildNumericSeries(level).family);
    }
    for (const family of ALL_FAMILIES) expect(seen.has(family)).toBe(true);
  });

  // Niveau 1 blijft bewust smal (instap), daarboven moet er echte keuze zijn.
  it('elk niveau biedt meerdere families (variatie tegen herhaling)', () => {
    const minimum: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 8, 5: 6, 6: 7 };
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const seen = new Set<NumericFamily>();
      for (let i = 0; i < 500; i++) seen.add(buildNumericSeries(level).family);
      expect(seen.size).toBeGreaterThanOrEqual(minimum[level]);
    }
  });

  // De opgaven moeten niet altijd uit dezelfde kleine getallen bestaan: op elk
  // niveau komen ook reeksen met tientallen of hoger voorbij.
  it('elk niveau kent zowel kleine als grotere getallen', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      let small = false;
      let large = false;
      for (let i = 0; i < 500; i++) {
        const highest = Math.max(...buildNumericSeries(level).terms.map(Math.abs));
        if (highest <= 30) small = true;
        if (highest >= 100) large = true;
      }
      expect(small).toBe(true);
      expect(large).toBe(true);
    }
  });

  it('negatieve getallen komen voor vanaf niveau 2, niet op niveau 1', () => {
    const hasNegative = (level: number, draws: number): boolean => {
      for (let i = 0; i < draws; i++) {
        const series = buildNumericSeries(level);
        if (series.answer < 0 || series.terms.some((t) => t < 0)) return true;
      }
      return false;
    };
    expect(hasNegative(1, 500)).toBe(false);
    for (let level = 2; level <= MAX_LEVEL; level++) expect(hasNegative(level, 500)).toBe(true);
  });
});

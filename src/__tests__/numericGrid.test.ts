import { describe, it, expect } from 'vitest';
import { MAX_LEVEL } from '../engine/types';
import {
  buildNumericGrid,
  generateNumeric,
  type NumericGridFamily,
  type NumericGridPuzzle,
} from '../generators/numeric';

// De matrixvormen komen vanaf niveau 3 voor.
const LEVELS = [3, 4, 5, 6];
const SAMPLES = 250;

const ALL_FAMILIES: NumericGridFamily[] = [
  'gridRowSum',
  'gridRowDiff',
  'gridColSum',
  'gridColProduct',
  'gridRowScaled',
  'gridRowMulMinus',
  'gridRowCol',
  'gridDiagonal',
];

const cell = (values: number[], row: number, col: number): number => values[row * 3 + col];
const rows = (values: number[]): number[][] => [0, 1, 2].map((r) => [0, 1, 2].map((c) => cell(values, r, c)));
const cols = (values: number[]): number[][] => [0, 1, 2].map((c) => [0, 1, 2].map((r) => cell(values, r, c)));

// Regels die geen extra parameter kennen: die zijn zo na te rekenen.
const SIMPLE_RULES: Partial<Record<NumericGridFamily, { lines: (v: number[]) => number[][]; third: (a: number, b: number) => number }>> = {
  gridRowSum: { lines: rows, third: (a, b) => a + b },
  gridRowDiff: { lines: rows, third: (a, b) => a - b },
  gridColSum: { lines: cols, third: (a, b) => a + b },
  gridColProduct: { lines: cols, third: (a, b) => a * b },
};

// Onafhankelijke controle of een compleet raster de regel van de familie
// volgt. De parameters (zoals de factor k) worden afgeleid uit de lijnen die
// het lege vakje niet bevatten, zodat de controle ook opgaat voor een raster
// waarin een afleider is ingevuld.
function fitsRule(family: NumericGridFamily, values: number[], missing: number): boolean {
  const simple = SIMPLE_RULES[family];
  if (simple) {
    return simple.lines(values).every((line) => line[2] === simple.third(line[0], line[1]));
  }

  const missingRow = Math.floor(missing / 3);
  const cleanRows = rows(values).filter((_, r) => r !== missingRow);

  if (family === 'gridRowScaled') {
    // k uit een volle rij: derde = (eerste + tweede) x k.
    const k = cleanRows[0][2] / (cleanRows[0][0] + cleanRows[0][1]);
    if (!Number.isInteger(k) || k < 2) return false;
    return rows(values).every((line) => line[2] === (line[0] + line[1]) * k);
  }

  if (family === 'gridRowMulMinus') {
    // k uit een volle rij: derde = eerste x k - tweede.
    const k = (cleanRows[0][2] + cleanRows[0][1]) / cleanRows[0][0];
    if (!Number.isInteger(k) || k < 2) return false;
    return rows(values).every((line) => line[2] === line[0] * k - line[1]);
  }

  if (family === 'gridRowCol') {
    const k = cleanRows[0][1] / cleanRows[0][0];
    if (!Number.isInteger(k) || k < 2) return false;
    if (!rows(values).every((line) => line[1] === line[0] * k && line[2] === line[1] * k)) return false;
    // De eerste kolom loopt met een vaste stap, en die stap gaat per kolom
    // ook keer k.
    const step = cell(values, 1, 0) - cell(values, 0, 0);
    if (step === 0) return false;
    for (let c = 0; c < 3; c++) {
      for (let r = 1; r < 3; r++) {
        if (cell(values, r, c) - cell(values, r - 1, c) !== step * k ** c) return false;
      }
    }
    return true;
  }

  // gridDiagonal: elk vakje hangt alleen af van rij + kolom, en die reeks
  // heeft een constant tweede verschil.
  const byDiagonal = new Map<number, number>();
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const key = r + c;
      const seen = byDiagonal.get(key);
      if (seen === undefined) byDiagonal.set(key, cell(values, r, c));
      else if (seen !== cell(values, r, c)) return false;
    }
  }
  const f = [0, 1, 2, 3, 4].map((i) => byDiagonal.get(i) as number);
  const d1 = f.slice(1).map((v, i) => v - f[i]);
  const d2 = d1.slice(1).map((v, i) => v - d1[i]);
  return d2[0] !== 0 && d2.every((v) => v === d2[0]);
}

describe('cijfermatrix-generator', () => {
  for (const level of LEVELS) {
    it(`niveau ${level}: het raster volgt de regel en het antwoord klopt (${SAMPLES} trekkingen)`, () => {
      for (let i = 0; i < SAMPLES; i++) {
        const puzzle: NumericGridPuzzle = buildNumericGrid(level);
        expect(puzzle.cols).toBe(3);
        expect(puzzle.values).toHaveLength(9);
        expect(puzzle.missing).toBeGreaterThanOrEqual(0);
        expect(puzzle.missing).toBeLessThan(9);
        expect(puzzle.values.every(Number.isInteger)).toBe(true);
        expect(puzzle.answer).toBe(puzzle.values[puzzle.missing]);
        expect(fitsRule(puzzle.family, puzzle.values, puzzle.missing)).toBe(true);
      }
    });
  }

  for (const level of LEVELS) {
    it(`niveau ${level}: geen enkele afleider past ook in het lege vakje (${SAMPLES} trekkingen)`, () => {
      for (let i = 0; i < SAMPLES; i++) {
        const puzzle = buildNumericGrid(level);
        for (const wrong of new Set(puzzle.distractors)) {
          if (wrong === puzzle.answer) continue;
          const filled = [...puzzle.values];
          filled[puzzle.missing] = wrong;
          expect(fitsRule(puzzle.family, filled, puzzle.missing)).toBe(false);
        }
      }
    });
  }

  it('elke matrixfamilie komt voor', () => {
    const seen = new Set<NumericGridFamily>();
    for (const level of LEVELS) {
      for (let i = 0; i < 200; i++) seen.add(buildNumericGrid(level).family);
    }
    for (const family of ALL_FAMILIES) expect(seen.has(family)).toBe(true);
  });

  it('het lege vakje staat niet altijd op dezelfde plek', () => {
    const seen = new Set<number>();
    for (const level of LEVELS) {
      for (let i = 0; i < 200; i++) seen.add(buildNumericGrid(level).missing);
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });

  it('het item levert een raster met precies een vraagteken', () => {
    let gridsSeen = 0;
    for (const level of LEVELS) {
      for (let i = 0; i < 400; i++) {
        const item = generateNumeric(level);
        if (item.form !== 'numericGrid') continue;
        gridsSeen++;
        const grid = item.grid;
        expect(grid).toBeDefined();
        if (!grid) continue;
        expect(grid.cols).toBe(3);
        expect(grid.cells.length % grid.cols).toBe(0);
        expect(grid.cells.filter((c) => c === '?')).toHaveLength(1);
        // De vraagtekst bevat geen reeks: het raster staat apart.
        expect(item.prompt).not.toMatch(/\d/);
        expect(item.options).toHaveLength(4);
        expect(new Set(item.options).size).toBe(4);
      }
    }
    expect(gridsSeen).toBeGreaterThan(50);
  });

  // De matrixvorm mag de reeksen niet verdringen: samen met de vreemde eend is
  // ongeveer een op de vijf vragen een andere vorm dan een reeks.
  it('reeksen blijven de kernvorm op niveau 3 tot en met 6', () => {
    let grids = 0;
    let total = 0;
    for (const level of LEVELS) {
      for (let i = 0; i < 1000; i++) {
        total++;
        if (generateNumeric(level).form === 'numericGrid') grids++;
      }
    }
    expect(grids / total).toBeGreaterThan(0.05);
    expect(grids / total).toBeLessThan(0.16);
  });

  it('onder niveau 3 komt er geen raster voor', () => {
    for (let level = 1; level <= MAX_LEVEL - 4; level++) {
      for (let i = 0; i < 300; i++) expect(generateNumeric(level).form).toBe('numericSeries');
    }
  });
});

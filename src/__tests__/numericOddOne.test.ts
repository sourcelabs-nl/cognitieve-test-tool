import { describe, it, expect } from 'vitest';
import {
  buildNumericOddOne,
  generateNumeric,
  type NumericOddFamily,
} from '../generators/numeric';

// De vreemde eend komt vanaf niveau 3 voor.
const LEVELS = [3, 4, 5, 6];
const SAMPLES = 250;

const ALL_FAMILIES: NumericOddFamily[] = [
  'oddArithmetic',
  'oddGeometric',
  'oddQuadratic',
  'oddInterwoven',
  'oddRecursive',
  'oddGeoDiff',
  'oddFibonacci',
  'oddAltOps',
];

const diffs = (values: number[]): number[] => values.slice(1).map((v, i) => v - values[i]);

// --- Onafhankelijke controle: klopt een hele rij volgens een regel? ---
//
// Deze predicaten staan los van de generator: ze zijn hier apart uitgeschreven
// zodat een fout in de generator niet meelift in de controle.

type Predicate = (row: number[]) => boolean;

const isArithmetic: Predicate = (row) => {
  const d = diffs(row);
  return d[0] !== 0 && d.every((x) => x === d[0]);
};

const isGeometric: Predicate = (row) => {
  if (row[0] === 0 || row[1] % row[0] !== 0) return false;
  const r = row[1] / row[0];
  return Math.abs(r) >= 2 && row.every((v, i) => i === 0 || v === row[i - 1] * r);
};

const isQuadratic: Predicate = (row) => {
  const d2 = diffs(diffs(row));
  return d2[0] !== 0 && d2.every((x) => x === d2[0]);
};

const isInterwoven: Predicate = (row) => {
  const steps: number[] = [];
  for (const parity of [0, 1]) {
    const strand = row.filter((_, i) => i % 2 === parity);
    if (strand.length < 4) return false;
    const d = diffs(strand);
    if (d[0] === 0 || !d.every((x) => x === d[0])) return false;
    steps.push(d[0]);
  }
  return steps[0] !== steps[1];
};

const isRecursive: Predicate = (row) => {
  if (row[1] === row[0]) return false;
  const m = (row[2] - row[1]) / (row[1] - row[0]);
  if (!Number.isInteger(m) || m < 2 || m > 6) return false;
  const c = row[1] - m * row[0];
  return c !== 0 && row.every((v, i) => i === 0 || v === row[i - 1] * m + c);
};

const isGeoDiff: Predicate = (row) => {
  const d = diffs(row);
  if (d[0] === 0 || d[1] % d[0] !== 0) return false;
  const r = d[1] / d[0];
  return r >= 2 && r <= 5 && d.every((v, i) => i === 0 || v === d[i - 1] * r);
};

const isFibonacci: Predicate = (row) => row.every((v, i) => i < 2 || v === row[i - 1] + row[i - 2]);

const isAltOps: Predicate = (row) => {
  if (row[0] === 0 || row[1] % row[0] !== 0) return false;
  const m = row[1] / row[0];
  const a = row[2] - row[1];
  if (m < 2 || m > 5 || a === 0) return false;
  return row.every((v, i) => i === 0 || v === (i % 2 === 1 ? row[i - 1] * m : row[i - 1] + a));
};

const PREDICATES: Record<NumericOddFamily, Predicate> = {
  oddArithmetic: isArithmetic,
  oddGeometric: isGeometric,
  oddQuadratic: isQuadratic,
  oddInterwoven: isInterwoven,
  oddRecursive: isRecursive,
  oddGeoDiff: isGeoDiff,
  oddFibonacci: isFibonacci,
  oddAltOps: isAltOps,
};

// --- Onafhankelijke controle: welke plek is te repareren? ---
//
// Per regel en per plek wordt een kandidaatrij gebouwd uit een venster dat de
// verdachte plek niet bevat, waarna het predicaat het laatste woord heeft.
// Anders dan de generator, die alle vensters langsloopt, kiest deze controle
// bewust een enkel venster: dat is genoeg zolang er maar een term bedorven is,
// en levert een tweede, eenvoudiger implementatie op.

// Vensterlengte per regel: zoveel opeenvolgende termen zijn nodig om hem af te
// leiden.
const WINDOW: Record<NumericOddFamily, number> = {
  oddArithmetic: 2,
  oddGeometric: 2,
  oddQuadratic: 3,
  oddInterwoven: 0, // niet aaneengesloten, zie hieronder
  oddRecursive: 3,
  oddGeoDiff: 3,
  oddFibonacci: 2,
  oddAltOps: 3,
};

// Vult de rij vanuit een venster, met de stap vooruit en achteruit.
function fill(
  n: number,
  start: number,
  known: number[],
  next: (out: number[], k: number) => number,
  back: (out: number[], k: number) => number,
): number[] | null {
  const out = new Array<number>(n);
  known.forEach((v, i) => (out[start + i] = v));
  for (let k = start + known.length; k < n; k++) {
    const v = next(out, k);
    if (!Number.isInteger(v)) return null;
    out[k] = v;
  }
  for (let k = start - 1; k >= 0; k--) {
    const v = back(out, k);
    if (!Number.isInteger(v)) return null;
    out[k] = v;
  }
  return out;
}

// Reconstrueert de rij volgens `family` uit een venster dat plek `skip` mijdt.
function reconstruct(family: NumericOddFamily, row: number[], skip: number): number[] | null {
  const n = row.length;

  if (family === 'oddInterwoven') {
    // Neem twee schone termen uit elke reeks; de reeks van `skip` heeft er nog
    // minstens twee over.
    const anchors: number[][] = [];
    for (const parity of [0, 1]) {
      const idx = row.map((_, i) => i).filter((i) => i % 2 === parity && i !== skip);
      if (idx.length < 2) return null;
      anchors.push([idx[0], idx[1]]);
    }
    const steps = anchors.map(([a, b]) => (row[b] - row[a]) / ((b - a) / 2));
    if (!steps.every((s) => Number.isInteger(s) && s !== 0)) return null;
    return row.map((_, k) => {
      const [a] = anchors[k % 2];
      return row[a] + ((k - a) / 2) * steps[k % 2];
    });
  }

  const size = WINDOW[family];
  // Het eerste venster dat `skip` niet bevat.
  let start = -1;
  for (let s = 0; s + size <= n; s++) {
    if (skip < s || skip >= s + size) {
      start = s;
      break;
    }
  }
  if (start < 0) return null;
  const known = Array.from({ length: size }, (_, i) => row[start + i]);
  const i = start;

  if (family === 'oddArithmetic') {
    const d = known[1] - known[0];
    if (d === 0) return null;
    return fill(n, i, known, (o, k) => o[k - 1] + d, (o, k) => o[k + 1] - d);
  }

  if (family === 'oddGeometric') {
    if (known[0] === 0 || known[1] % known[0] !== 0) return null;
    const r = known[1] / known[0];
    if (Math.abs(r) < 2) return null;
    return fill(n, i, known, (o, k) => o[k - 1] * r, (o, k) => o[k + 1] / r);
  }

  if (family === 'oddQuadratic') {
    const d1 = known[1] - known[0];
    const e = known[2] - known[1] - d1;
    if (e === 0) return null;
    return fill(
      n,
      i,
      known,
      (o, k) => o[k - 1] + d1 + (k - 1 - i) * e,
      (o, k) => o[k + 1] - (d1 + (k - i) * e),
    );
  }

  if (family === 'oddRecursive') {
    if (known[1] === known[0]) return null;
    const m = (known[2] - known[1]) / (known[1] - known[0]);
    if (!Number.isInteger(m) || m < 2 || m > 6) return null;
    const c = known[1] - m * known[0];
    if (c === 0) return null;
    return fill(n, i, known, (o, k) => o[k - 1] * m + c, (o, k) => (o[k + 1] - c) / m);
  }

  if (family === 'oddGeoDiff') {
    const d0 = known[1] - known[0];
    if (d0 === 0 || (known[2] - known[1]) % d0 !== 0) return null;
    const r = (known[2] - known[1]) / d0;
    if (r < 2 || r > 5) return null;
    return fill(
      n,
      i,
      known,
      (o, k) => o[k - 1] + d0 * r ** (k - 1 - i),
      (o, k) => o[k + 1] - d0 / r ** (i - k),
    );
  }

  if (family === 'oddFibonacci') {
    return fill(n, i, known, (o, k) => o[k - 1] + o[k - 2], (o, k) => o[k + 2] - o[k + 1]);
  }

  // oddAltOps: de fase volgt uit de index, want stap 0, 2, 4 zijn de keer-stappen.
  let m: number;
  let a: number;
  if (i % 2 === 0) {
    if (known[0] === 0 || known[1] % known[0] !== 0) return null;
    m = known[1] / known[0];
    a = known[2] - known[1];
  } else {
    a = known[1] - known[0];
    if (known[1] === 0 || known[2] % known[1] !== 0) return null;
    m = known[2] / known[1];
  }
  if (m < 2 || m > 5 || a === 0) return null;
  return fill(
    n,
    i,
    known,
    (o, k) => ((k - 1) % 2 === 0 ? o[k - 1] * m : o[k - 1] + a),
    (o, k) => (k % 2 === 0 ? o[k + 1] / m : o[k + 1] - a),
  );
}

// Alle plekken waarvan het vervangen van dat ene getal de rij weer kloppend
// maakt. Een lege verzameling met de sentinel -1 betekent: de rij klopt al.
function repairable(row: number[]): Set<number> {
  const spots = new Set<number>();
  for (const family of ALL_FAMILIES) {
    if (PREDICATES[family](row)) spots.add(-1);
    for (let p = 0; p < row.length; p++) {
      const candidate = reconstruct(family, row, p);
      if (!candidate) continue;
      const differing = row.map((_, k) => k).filter((k) => candidate[k] !== row[k]);
      if (differing.length === 1 && differing[0] === p && PREDICATES[family](candidate)) spots.add(p);
    }
  }
  return spots;
}

describe('"welke hoort niet in de rij"-generator', () => {
  for (const level of LEVELS) {
    it(`niveau ${level}: precies een getal is te vervangen, en dat is het antwoord (${SAMPLES} trekkingen)`, () => {
      for (let s = 0; s < SAMPLES; s++) {
        const puzzle = buildNumericOddOne(level);
        expect(puzzle.row.length).toBeGreaterThanOrEqual(6);
        expect(puzzle.row.every(Number.isInteger)).toBe(true);
        expect(puzzle.answer).toBe(puzzle.row[puzzle.index]);
        // De vreemde eend staat nooit vooraan of achteraan.
        expect(puzzle.index).toBeGreaterThanOrEqual(2);
        expect(puzzle.index).toBeLessThanOrEqual(puzzle.row.length - 2);

        // De rij zelf klopt niet, en met de schone waarde erin wel.
        expect(PREDICATES[puzzle.family](puzzle.row)).toBe(false);
        const repaired = [...puzzle.row];
        repaired[puzzle.index] = puzzle.cleanValue;
        expect(PREDICATES[puzzle.family](repaired)).toBe(true);

        // En er is geen tweede plek die de rij ook kloppend zou maken.
        expect([...repairable(puzzle.row)]).toEqual([puzzle.index]);
      }
    });
  }

  for (const level of LEVELS) {
    it(`niveau ${level}: de opties zijn vier getallen uit de rij (${SAMPLES} trekkingen)`, () => {
      for (let s = 0; s < SAMPLES; s++) {
        const puzzle = buildNumericOddOne(level);
        expect(puzzle.distractors).toHaveLength(3);
        expect(new Set(puzzle.distractors).size).toBe(3);
        for (const d of puzzle.distractors) {
          expect(puzzle.row).toContain(d);
          expect(d).not.toBe(puzzle.answer);
        }
      }
    });
  }

  it('elke regel-familie komt voor', () => {
    const seen = new Set<NumericOddFamily>();
    for (const level of LEVELS) {
      for (let i = 0; i < 200; i++) seen.add(buildNumericOddOne(level).family);
    }
    for (const family of ALL_FAMILIES) expect(seen.has(family)).toBe(true);
  });

  it('het item toont de rij en heeft vier unieke opties', () => {
    let seen = 0;
    for (const level of LEVELS) {
      for (let i = 0; i < 400; i++) {
        const item = generateNumeric(level);
        if (item.form !== 'numericOddOne') continue;
        seen++;
        expect(item.grid).toBeUndefined();
        expect(item.prompt).toContain('Welk getal hoort niet in de rij?');
        expect(item.options).toHaveLength(4);
        expect(new Set(item.options).size).toBe(4);
        // Alle opties staan in de rij zelf.
        const shown = item.prompt.split('\n\n')[1].split(', ');
        for (const option of item.options) expect(shown).toContain(option);
      }
    }
    expect(seen).toBeGreaterThan(50);
  });

  // Samen met de matrix is ongeveer een op de vijf vragen geen reeks.
  it('de vreemde eend verdringt de reeksen niet', () => {
    let odd = 0;
    let total = 0;
    for (const level of LEVELS) {
      for (let i = 0; i < 1000; i++) {
        total++;
        if (generateNumeric(level).form === 'numericOddOne') odd++;
      }
    }
    expect(odd / total).toBeGreaterThan(0.05);
    expect(odd / total).toBeLessThan(0.16);
  });
});

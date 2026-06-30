// Cijferpatronen: procedureel gegenereerde getallenreeksen op niveau 1..5.
// Per niveau zijn er meerdere strategieen die door elkaar worden gebruikt, zo
// gekozen dat ze didactisch even zwaar zijn. De gebruiker krijgt dus variatie
// (optellen, aftrekken, vermenigvuldigen, veranderende stap, verweven reeksen,
// recursieve regels en bijzondere reeksen) zonder dat de moeilijkheid springt.
//
// Elke strategie is bewust beperkt zodat er exact een logische voortzetting is.
// De familie (family) van elke reeks maakt onafhankelijke validatie in de tests
// mogelijk.

import type { Item } from '../engine/types';
import { randInt, pick, buildOptions } from './random';

export type NumericFamily =
  | 'arithmetic' // constante stap (+ of -)
  | 'geometric' // constante factor (x)
  | 'arithmetic2' // veranderende stap (oplopend of aflopend)
  | 'interwoven' // twee verweven reeksen
  | 'doublingPlus' // recursief: vorige x m + c
  | 'altops' // afwisselend x en +
  | 'special'; // kwadraten, derdemachten, Fibonacci, priemgetallen

export interface NumericSeries {
  terms: number[];
  answer: number;
  explanation: string;
  family: NumericFamily;
}

// --- Strategieen ---

function arithmeticUp(stepMin: number, stepMax: number): NumericSeries {
  const start = randInt(1, 9);
  const step = randInt(stepMin, stepMax);
  const terms = Array.from({ length: 5 }, (_, i) => start + i * step);
  return {
    terms,
    answer: start + 5 * step,
    explanation: `Elke stap is +${step}. ${terms[4]} + ${step} = ${start + 5 * step}.`,
    family: 'arithmetic',
  };
}

function arithmeticDown(stepMin: number, stepMax: number): NumericSeries {
  const step = randInt(stepMin, stepMax);
  const start = randInt(6 * step, 6 * step + 30); // houdt alle termen positief
  const terms = Array.from({ length: 5 }, (_, i) => start - i * step);
  return {
    terms,
    answer: start - 5 * step,
    explanation: `Elke stap is -${step}. ${terms[4]} - ${step} = ${start - 5 * step}.`,
    family: 'arithmetic',
  };
}

function geometric(ratios: number[], startMax: number): NumericSeries {
  const ratio = pick(ratios);
  const start = randInt(2, startMax);
  const terms = Array.from({ length: 5 }, (_, i) => start * ratio ** i);
  return {
    terms,
    answer: start * ratio ** 5,
    explanation: `Elke term is de vorige keer ${ratio}. ${terms[4]} x ${ratio} = ${start * ratio ** 5}.`,
    family: 'geometric',
  };
}

function arithmetic2Up(): NumericSeries {
  const start = randInt(1, 9);
  const firstStep = randInt(1, 4);
  const increment = randInt(1, 3);
  const terms = [start];
  for (let i = 0; i < 4; i++) terms.push(terms[i] + firstStep + i * increment);
  const lastStep = firstStep + 4 * increment;
  return {
    terms,
    answer: terms[4] + lastStep,
    explanation: `De stap loopt op met +${increment}: +${firstStep}, +${firstStep + increment}, ... De volgende stap is +${lastStep}, dus ${terms[4]} + ${lastStep} = ${terms[4] + lastStep}.`,
    family: 'arithmetic2',
  };
}

function arithmetic2Down(): NumericSeries {
  const decrement = randInt(1, 3);
  const firstStep = randInt(4 * decrement + 1, 4 * decrement + 8); // laatste stap blijft positief
  const start = randInt(1, 9);
  const terms = [start];
  for (let i = 0; i < 4; i++) terms.push(terms[i] + firstStep - i * decrement);
  const lastStep = firstStep - 4 * decrement;
  return {
    terms,
    answer: terms[4] + lastStep,
    explanation: `De stap wordt elke keer ${decrement} kleiner: +${firstStep}, +${firstStep - decrement}, ... De volgende stap is +${lastStep}, dus ${terms[4]} + ${lastStep} = ${terms[4] + lastStep}.`,
    family: 'arithmetic2',
  };
}

function interwoven(stepMax: number): NumericSeries {
  const startA = randInt(1, 9);
  const stepA = randInt(2, stepMax);
  const startB = randInt(10, 19);
  const stepB = randInt(2, stepMax);
  const terms = [
    startA,
    startB,
    startA + stepA,
    startB + stepB,
    startA + 2 * stepA,
    startB + 2 * stepB,
  ];
  return {
    terms,
    answer: startA + 3 * stepA,
    explanation: `Twee verweven reeksen. De oneven posities lopen +${stepA} (${startA}, ${startA + stepA}, ${startA + 2 * stepA}, ...), de even posities +${stepB}. De volgende term hoort bij de eerste reeks: ${startA + 2 * stepA} + ${stepA} = ${startA + 3 * stepA}.`,
    family: 'interwoven',
  };
}

function doublingPlus(): NumericSeries {
  const m = pick([2, 3]);
  const c = randInt(1, 3);
  const start = randInt(1, 3);
  const terms = [start];
  for (let i = 0; i < 4; i++) terms.push(terms[i] * m + c);
  return {
    terms,
    answer: terms[4] * m + c,
    explanation: `Elke term is de vorige keer ${m} plus ${c}. ${terms[4]} x ${m} + ${c} = ${terms[4] * m + c}.`,
    family: 'doublingPlus',
  };
}

function altOps(): NumericSeries {
  const start = randInt(2, 5);
  const add = randInt(2, 5);
  const mult = pick([2, 3]);
  const terms = [start];
  const ops: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (i % 2 === 0) {
      terms.push(terms[i] * mult);
      ops.push(`x${mult}`);
    } else {
      terms.push(terms[i] + add);
      ops.push(`+${add}`);
    }
  }
  return {
    terms,
    answer: terms[4] * mult,
    explanation: `De bewerkingen wisselen elkaar af: ${ops.join(', ')}, ... De volgende bewerking is x${mult}, dus ${terms[4]} x ${mult} = ${terms[4] * mult}.`,
    family: 'altops',
  };
}

function squares(): NumericSeries {
  const offset = randInt(1, 3);
  const terms = Array.from({ length: 5 }, (_, i) => (i + offset) ** 2);
  const n = 5 + offset;
  return {
    terms,
    answer: n ** 2,
    explanation: `Dit zijn kwadraten: ${terms.map((_, i) => `${i + offset}^2`).join(', ')}, ... De volgende is ${n}^2 = ${n ** 2}.`,
    family: 'special',
  };
}

function cubes(): NumericSeries {
  const offset = randInt(1, 2);
  const terms = Array.from({ length: 5 }, (_, i) => (i + offset) ** 3);
  const n = 5 + offset;
  return {
    terms,
    answer: n ** 3,
    explanation: `Dit zijn derdemachten: ${terms.map((_, i) => `${i + offset}^3`).join(', ')}, ... De volgende is ${n}^3 = ${n ** 3}.`,
    family: 'special',
  };
}

function fibonacci(): NumericSeries {
  const a = randInt(1, 4);
  const b = randInt(a + 1, a + 5);
  const all = [a, b];
  for (let i = 2; i < 6; i++) all.push(all[i - 1] + all[i - 2]);
  const terms = all.slice(0, 5);
  return {
    terms,
    answer: all[5],
    explanation: `Elke term is de som van de twee voorgaande: ${terms[3]} + ${terms[4]} = ${all[5]}.`,
    family: 'special',
  };
}

function primes(): NumericSeries {
  const list = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43];
  const startIdx = randInt(0, list.length - 6);
  const terms = list.slice(startIdx, startIdx + 5);
  return {
    terms,
    answer: list[startIdx + 5],
    explanation: `Dit zijn opeenvolgende priemgetallen. Het volgende priemgetal na ${terms[4]} is ${list[startIdx + 5]}.`,
    family: 'special',
  };
}

// --- Niveau-indeling: strategieen van vergelijkbare zwaarte per niveau ---

const strategiesByLevel: Record<number, (() => NumericSeries)[]> = {
  1: [() => arithmeticUp(2, 6), () => arithmeticDown(2, 5)],
  2: [() => arithmeticUp(7, 15), () => arithmeticDown(7, 14), () => geometric([2, 3], 4)],
  3: [arithmetic2Up, arithmetic2Down, () => interwoven(6)],
  4: [altOps, doublingPlus, () => geometric([3, 4], 4)],
  5: [squares, cubes, fibonacci, primes],
};

// Bouwt een reeks voor een gegeven niveau (1..5). Exporteerbaar voor tests.
export function buildNumericSeries(level: number): NumericSeries {
  const clamped = Math.min(5, Math.max(1, Math.round(level)));
  const strategies = strategiesByLevel[clamped];
  return pick(strategies)();
}

let counter = 0;

export function generateNumeric(level: number): Item {
  const clamped = Math.min(5, Math.max(1, Math.round(level)));
  const series = buildNumericSeries(clamped);
  const correct = String(series.answer);
  const distractors = [
    String(series.answer + 1),
    String(series.answer - 1),
    String(series.answer + 2),
    String(series.terms[series.terms.length - 1]),
    String(series.answer - 2),
  ];
  const { options, correctIndex } = buildOptions(correct, distractors);
  counter += 1;
  return {
    id: `numeric-${clamped}-${counter}`,
    category: 'numeric',
    level: clamped,
    prompt: `Welk getal komt er op de plek van het vraagteken?\n\n${series.terms.join(', ')}, ?`,
    options,
    correctIndex,
    explanation: series.explanation,
  };
}

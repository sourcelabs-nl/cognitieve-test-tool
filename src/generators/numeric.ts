// Cijferpatronen: procedureel gegenereerde getallenreeksen op niveau 1..5.
// Per niveau zijn er meerdere strategieen die door elkaar worden gebruikt, zo
// gekozen dat ze didactisch even zwaar zijn. De gebruiker krijgt dus variatie
// (optellen, aftrekken, vermenigvuldigen, delen, veranderende stap, wisselende
// tekens, verweven reeksen, recursieve regels en bijzondere reeksen) zonder dat
// de moeilijkheid binnen een niveau springt.
//
// Negatieve getallen komen vanaf niveau 2 voor: eerst als dalende reeks die
// door nul heen zakt, daarna als wisselende stappen, negatieve constanten en
// een negatieve factor.
//
// Elke strategie is bewust beperkt zodat er exact een logische voortzetting is.
// De familie (family) van elke reeks maakt onafhankelijke validatie in de tests
// mogelijk.

import type { Item } from '../engine/types';
import { randInt, pick, buildOptions } from './random';
import { stepLabel } from './format';

export type NumericFamily =
  | 'arithmetic' // constante stap (+ of -), mag door nul heen
  | 'geometric' // constante factor (mag negatief zijn)
  | 'divide' // constante deler
  | 'arithmetic2' // veranderende stap (oplopend of aflopend)
  | 'zigzag' // afwisselend +a en -b
  | 'interwoven' // twee verweven reeksen
  | 'recursive' // vorige x m + c (c mag negatief zijn)
  | 'altops' // afwisselend x en + (of -)
  | 'squares' // kwadraten, eventueel met vaste verschuiving
  | 'cubes' // derdemachten, eventueel met vaste verschuiving
  | 'powers' // machten van 2 of 3, met vaste verschuiving
  | 'fibonacci' // som van de twee voorgaande
  | 'primes'; // opeenvolgende priemgetallen

export interface NumericSeries {
  terms: number[];
  answer: number;
  explanation: string;
  family: NumericFamily;
  // Optionele, op maat gemaakte afleiders. Zonder dit veld gebruikt de
  // generator de standaard afleiders rond het juiste antwoord.
  distractors?: number[];
}

// --- Tekst-hulpjes zodat uitleg met negatieve getallen leesbaar blijft ---

// Schrijft het toepassen van een stap uit: "12 - 5 = 7", niet "12 + -5 = 7".
function applied(from: number, step: number): string {
  return `${from} ${step < 0 ? '-' : '+'} ${Math.abs(step)} = ${from + step}`;
}

// Trekt een getal uit het bereik dat niet gelijk is aan `not`.
function randIntExcept(min: number, max: number, not: number): number {
  let value = randInt(min, max);
  while (value === not) value = randInt(min, max);
  return value;
}

// Schrijft een term met vaste verschuiving uit: "3^2 - 2", of "3^2" bij nul.
function shifted(base: string, offset: number): string {
  if (offset === 0) return base;
  return `${base} ${offset < 0 ? '-' : '+'} ${Math.abs(offset)}`;
}

// Beschrijft de verschuiving in woorden: ", telkens min 2".
function offsetWord(offset: number): string {
  if (offset === 0) return '';
  return `, telkens ${offset < 0 ? `min ${-offset}` : `plus ${offset}`}`;
}

// --- Strategieen ---

interface ArithmeticOptions {
  start: number;
  step: number; // negatief = dalende reeks
}

function arithmetic({ start, step }: ArithmeticOptions): NumericSeries {
  const terms = Array.from({ length: 5 }, (_, i) => start + i * step);
  return {
    terms,
    answer: start + 5 * step,
    explanation: `Elke stap is ${stepLabel(step)}. ${applied(terms[4], step)}.`,
    family: 'arithmetic',
  };
}

// Dalende reeks die volledig positief blijft.
function arithmeticDown(stepMin: number, stepMax: number): NumericSeries {
  const step = randInt(stepMin, stepMax);
  return arithmetic({ start: randInt(5 * step, 5 * step + 30), step: -step });
}

// Dalende reeks die gegarandeerd door nul heen zakt: de kennismaking met
// negatieve getallen. Het startpunt ligt tussen 2 en 4 stappen boven nul, dus
// de reeks begint positief en het antwoord is altijd negatief.
function arithmeticThroughZero(stepMin: number, stepMax: number): NumericSeries {
  const step = randInt(stepMin, stepMax);
  return arithmetic({ start: randInt(2 * step, 4 * step), step: -step });
}

function geometric(ratios: readonly number[], startMax: number): NumericSeries {
  const ratio = pick(ratios);
  const start = randInt(2, startMax);
  const terms = Array.from({ length: 5 }, (_, i) => start * ratio ** i);
  const answer = start * ratio ** 5;
  const signHint = ratio < 0 ? ' Het teken wisselt daardoor elke stap.' : '';
  return {
    terms,
    answer,
    explanation: `Elke term is de vorige keer ${ratio}.${signHint} ${terms[4]} x ${ratio} = ${answer}.`,
    family: 'geometric',
    distractors:
      ratio < 0
        ? // Bij een negatieve factor is hetzelfde getal met het verkeerde teken
          // de meest verleidelijke fout.
          [-answer, answer + ratio, answer - ratio]
        : [terms[4] * (ratio + 1), terms[4] + (terms[4] - terms[3]), answer + ratio],
  };
}

// Dalende reeks door telkens te delen. Het startgetal is zo gekozen dat alle
// termen en het antwoord hele getallen zijn.
function divide(divisors: readonly number[]): NumericSeries {
  const divisor = pick(divisors);
  const answer = randInt(1, 3);
  const start = answer * divisor ** 5;
  const terms = Array.from({ length: 5 }, (_, i) => start / divisor ** i);
  return {
    terms,
    answer,
    explanation: `Elke term is de vorige gedeeld door ${divisor}. ${terms[4]} : ${divisor} = ${answer}.`,
    family: 'divide',
  };
}

interface Arithmetic2Options {
  start: number;
  firstStep: number;
  increment: number; // verandering van de stap; negatief = stap wordt kleiner
}

function arithmetic2({ start, firstStep, increment }: Arithmetic2Options): NumericSeries {
  const terms = [start];
  for (let i = 0; i < 4; i++) terms.push(terms[i] + firstStep + i * increment);
  const nextStep = firstStep + 4 * increment;
  const shown = [firstStep, firstStep + increment, firstStep + 2 * increment];
  return {
    terms,
    answer: terms[4] + nextStep,
    explanation: `De stap verandert elke keer met ${stepLabel(increment)}: ${shown
      .map(stepLabel)
      .join(', ')}, ... De volgende stap is ${stepLabel(nextStep)}, dus ${applied(terms[4], nextStep)}.`,
    family: 'arithmetic2',
  };
}

// Stap die oploopt.
function arithmetic2Up(): NumericSeries {
  return arithmetic2({ start: randInt(1, 9), firstStep: randInt(1, 4), increment: randInt(1, 3) });
}

// Stap die kleiner wordt maar positief blijft: de reeks stijgt steeds trager.
function arithmetic2Down(): NumericSeries {
  const increment = randInt(1, 3);
  return arithmetic2({
    start: randInt(1, 9),
    firstStep: randInt(4 * increment + 1, 4 * increment + 8),
    increment: -increment,
  });
}

// Stap die door nul heen kantelt: de reeks stijgt eerst en daalt daarna.
function arithmetic2Turning(): NumericSeries {
  const increment = randInt(3, 5);
  return arithmetic2({
    start: randInt(4, 15),
    firstStep: randInt(increment, 2 * increment),
    increment: -increment,
  });
}

interface ZigzagOptions {
  start: number;
  up: number;
  down: number;
}

// Twee stappen die elkaar afwisselen: +up, -down, +up, -down, ...
function zigzag({ start, up, down }: ZigzagOptions): NumericSeries {
  const terms = [start];
  for (let i = 0; i < 4; i++) terms.push(terms[i] + (i % 2 === 0 ? up : -down));
  return {
    terms,
    answer: terms[4] + up,
    explanation: `De stappen wisselen elkaar af: +${up}, -${down}, +${up}, -${down}, ... De volgende stap is +${up}, dus ${applied(terms[4], up)}.`,
    family: 'zigzag',
  };
}

interface InterwovenOptions {
  startA: number;
  stepA: number;
  startB: number;
  stepB: number; // mag negatief zijn: de tweede reeks daalt dan
}

// Twee reeksen die om en om staan. Het gevraagde getal hoort altijd bij reeks A
// (de oneven posities), zodat het antwoord eenduidig is.
function interwoven({ startA, stepA, startB, stepB }: InterwovenOptions): NumericSeries {
  const terms = [
    startA,
    startB,
    startA + stepA,
    startB + stepB,
    startA + 2 * stepA,
    startB + 2 * stepB,
  ];
  const answer = startA + 3 * stepA;
  return {
    terms,
    answer,
    explanation: `Twee verweven reeksen. De oneven posities lopen ${stepLabel(stepA)} (${startA}, ${startA + stepA}, ${startA + 2 * stepA}, ...), de even posities ${stepLabel(stepB)}. Het gevraagde getal hoort bij de eerste reeks: ${applied(startA + 2 * stepA, stepA)}.`,
    family: 'interwoven',
    // De voortzetting van de tweede reeks is hier de klassieke valkuil.
    distractors: [startB + 3 * stepB, answer + stepA, answer - stepA, answer + 1, answer - 1],
  };
}

interface RecursiveOptions {
  start: number;
  multiplier: number;
  constant: number; // mag negatief zijn
}

function recursive({ start, multiplier, constant }: RecursiveOptions): NumericSeries {
  const terms = [start];
  for (let i = 0; i < 4; i++) terms.push(terms[i] * multiplier + constant);
  const answer = terms[4] * multiplier + constant;
  const opWord = constant < 0 ? `min ${-constant}` : `plus ${constant}`;
  return {
    terms,
    answer,
    explanation: `Elke term is de vorige keer ${multiplier} ${opWord}. ${terms[4]} x ${multiplier} ${constant < 0 ? '-' : '+'} ${Math.abs(constant)} = ${answer}.`,
    family: 'recursive',
    // Fouten in de regel zijn leerzamer dan een verschil van 1: de constante
    // vergeten, hem dubbel toepassen, of hem voor het vermenigvuldigen optellen.
    distractors: [
      terms[4] * multiplier,
      answer + constant,
      (terms[4] + constant) * multiplier,
      answer + 1,
    ],
  };
}

// Bouwt een recursieve reeks en vermijdt het vaste punt (start = -c / (m - 1)),
// want daar zou de reeks constant worden en het patroon onleesbaar.
function recursiveIn(range: {
  startMin: number;
  startMax: number;
  multipliers: readonly number[];
  constants: readonly number[];
}): NumericSeries {
  const multiplier = pick(range.multipliers);
  const constant = pick(range.constants);
  const fixedPoint = -constant / (multiplier - 1);
  return recursive({
    start: randIntExcept(range.startMin, range.startMax, fixedPoint),
    multiplier,
    constant,
  });
}

interface AltOpsOptions {
  start: number;
  multiplier: number;
  addend: number; // mag negatief zijn
}

// Twee bewerkingen die elkaar afwisselen: x, +, x, +, ...
function altOps({ start, multiplier, addend }: AltOpsOptions): NumericSeries {
  const terms = [start];
  const ops: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (i % 2 === 0) {
      terms.push(terms[i] * multiplier);
      ops.push(`x${multiplier}`);
    } else {
      terms.push(terms[i] + addend);
      ops.push(stepLabel(addend));
    }
  }
  const answer = terms[4] * multiplier;
  return {
    terms,
    answer,
    explanation: `De bewerkingen wisselen elkaar af: ${ops.join(', ')}, ... De volgende bewerking is x${multiplier}, dus ${terms[4]} x ${multiplier} = ${answer}.`,
    family: 'altops',
    // De verkeerde bewerking aan de beurt laten komen is hier de valkuil.
    distractors: [terms[4] + addend, answer + addend, terms[4] * (multiplier + 1)],
  };
}

// Afwisselend keer en plus.
function altOpsPlus(): NumericSeries {
  return altOps({ start: randInt(2, 5), multiplier: pick([2, 3]), addend: randInt(2, 5) });
}

// Afwisselend keer en min. Het startgetal is ruim genoeg gekozen zodat de reeks
// niet naar nul zakt en het patroon zichtbaar blijft.
function altOpsMinus(): NumericSeries {
  const multiplier = pick([2, 3]);
  const start = randInt(4, 8);
  return altOps({ start, multiplier, addend: -randInt(2, Math.min(5, start * multiplier - 3)) });
}

function squares(): NumericSeries {
  const first = randInt(2, 4);
  const offset = randInt(-3, 3);
  const terms = Array.from({ length: 5 }, (_, i) => (first + i) ** 2 + offset);
  const n = first + 5;
  return {
    terms,
    answer: n ** 2 + offset,
    explanation: `Dit zijn kwadraten${offsetWord(offset)}: ${terms
      .map((_, i) => shifted(`${first + i}^2`, offset))
      .join(', ')}, ... De volgende is ${shifted(`${n}^2`, offset)} = ${n ** 2 + offset}.`,
    family: 'squares',
    distractors: [terms[4] + (terms[4] - terms[3]), n ** 2, (n + 1) ** 2 + offset],
  };
}

function cubes(): NumericSeries {
  const first = randInt(2, 3);
  const offset = randInt(-2, 2);
  const terms = Array.from({ length: 5 }, (_, i) => (first + i) ** 3 + offset);
  const n = first + 5;
  return {
    terms,
    answer: n ** 3 + offset,
    explanation: `Dit zijn derdemachten${offsetWord(offset)}: ${terms
      .map((_, i) => shifted(`${first + i}^3`, offset))
      .join(', ')}, ... De volgende is ${shifted(`${n}^3`, offset)} = ${n ** 3 + offset}.`,
    family: 'cubes',
    // Denken dat het verschil gelijk blijft is hier de klassieke fout.
    distractors: [terms[4] + (terms[4] - terms[3]), n ** 3, (n + 1) ** 3 + offset],
  };
}

// Machten van 2 of 3 met een vaste verschuiving, bijvoorbeeld 1, 3, 7, 15, 31.
function powers(): NumericSeries {
  const base = pick([2, 3]);
  const offset = pick([-1, 1]);
  const first = base === 2 ? randInt(1, 3) : randInt(1, 2);
  const terms = Array.from({ length: 5 }, (_, i) => base ** (first + i) + offset);
  const exponent = first + 5;
  const answer = base ** exponent + offset;
  return {
    terms,
    answer,
    explanation: `Dit zijn machten van ${base}${offsetWord(offset)}: ${terms
      .map((_, i) => shifted(`${base}^${first + i}`, offset))
      .join(', ')}, ... De volgende is ${shifted(`${base}^${exponent}`, offset)} = ${answer}.`,
    family: 'powers',
    // De verschuiving vergeten of verkeerd toepassen, of de stap gelijk houden.
    distractors: [base ** exponent, answer - 2 * offset, terms[4] + (terms[4] - terms[3])],
  };
}

function fibonacci(): NumericSeries {
  const a = randInt(1, 6);
  const b = randInt(a + 1, a + 8);
  const all = [a, b];
  for (let i = 2; i < 6; i++) all.push(all[i - 1] + all[i - 2]);
  const terms = all.slice(0, 5);
  return {
    terms,
    answer: all[5],
    explanation: `Elke term is de som van de twee voorgaande: ${terms[3]} + ${terms[4]} = ${all[5]}.`,
    family: 'fibonacci',
  };
}

const PRIME_LIST = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
];

function primes(): NumericSeries {
  const startIdx = randInt(0, PRIME_LIST.length - 6);
  const terms = PRIME_LIST.slice(startIdx, startIdx + 5);
  const answer = PRIME_LIST[startIdx + 5];
  return {
    terms,
    answer,
    explanation: `Dit zijn opeenvolgende priemgetallen. Het volgende priemgetal na ${terms[4]} is ${answer}.`,
    family: 'primes',
    // Alleen oneven afleiders: +1 zou een even getal zijn en dus te makkelijk
    // uit te sluiten.
    distractors: [answer + 2, answer - 2, answer + 4, answer + 6],
  };
}

// --- Niveau-indeling: strategieen van vergelijkbare zwaarte per niveau ---
//
// Niveau 1 en 2 blijven bewust toegankelijk (instap mbo 3-4); de variatie zit
// daar in het uiterlijk van de reeks, niet in de zwaarte. Vanaf niveau 3 loopt
// zowel het aantal als de zwaarte van de strategieen op.

const strategiesByLevel: Record<number, (() => NumericSeries)[]> = {
  1: [
    () => arithmetic({ start: randInt(1, 9), step: randInt(2, 6) }),
    () => arithmetic({ start: randInt(15, 40), step: randInt(2, 6) }),
    () => arithmeticDown(2, 5),
    () => geometric([2], 3), // verdubbelen: even toegankelijk, ander uiterlijk
  ],
  2: [
    () => arithmetic({ start: randInt(1, 9), step: randInt(7, 15) }),
    () => arithmeticDown(7, 14),
    () => arithmeticThroughZero(3, 8),
    () => geometric([2, 3], 4),
    () => divide([2]), // halveren
  ],
  3: [
    arithmetic2Up,
    arithmetic2Down,
    () => divide([2, 3]),
    () => {
      // Verschillende stappen, anders vallen beide reeksen samen tot een
      // simpele zigzag en klopt de uitleg niet meer.
      const stepA = randInt(2, 6);
      return interwoven({
        startA: randInt(1, 9),
        stepA,
        startB: randInt(10, 19),
        stepB: randIntExcept(2, 6, stepA),
      });
    },
    () => {
      const up = randInt(3, 9);
      return zigzag({ start: randInt(5, 15), up, down: randIntExcept(1, 8, up) });
    },
    () => {
      // Verweven reeks waarvan de tweede reeks door nul zakt, zodat negatieve
      // getallen ook op dit niveau geoefend worden.
      const stepB = randInt(5, 9);
      return interwoven({
        startA: randInt(1, 9),
        stepA: randInt(2, 6),
        startB: randInt(stepB, 2 * stepB - 1),
        stepB: -stepB,
      });
    },
  ],
  4: [
    altOpsPlus,
    altOpsMinus,
    arithmetic2Turning,
    () => geometric([3, 4], 4),
    () => recursiveIn({ startMin: 1, startMax: 3, multipliers: [2, 3], constants: [1, 2, 3, 4] }),
    () =>
      recursiveIn({ startMin: 3, startMax: 8, multipliers: [2, 3], constants: [-1, -2, -3, -4] }),
    () => interwoven({
      startA: randInt(2, 10),
      stepA: randInt(3, 8),
      startB: randInt(30, 50),
      stepB: -randInt(4, 9),
    }),
    () => {
      // De neerstap is altijd groter dan de opstap, dus de reeks zakt naar
      // negatieve getallen.
      const up = randInt(4, 8);
      return zigzag({ start: randInt(2, 6), up, down: up + randInt(4, 9) });
    },
  ],
  5: [
    squares,
    cubes,
    fibonacci,
    primes,
    powers,
    () => geometric([-2, -3], 4),
    () => recursiveIn({ startMin: 2, startMax: 5, multipliers: [3, 4], constants: [-3, -5, 5, 7] }),
    () => interwoven({
      startA: randInt(1, 9),
      stepA: randInt(4, 11),
      startB: randInt(40, 60),
      stepB: -randInt(6, 12),
    }),
  ],
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
  const fallback = [
    series.answer + 1,
    series.answer - 1,
    series.answer + 2,
    series.terms[series.terms.length - 1],
    series.answer - 2,
  ];
  const distractors = [...(series.distractors ?? []), ...fallback];
  const { options, correctIndex } = buildOptions(
    String(series.answer),
    distractors.map(String),
  );
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

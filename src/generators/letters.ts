// Letterpatronen: procedureel gegenereerde letterreeksen op niveau 1..5.
// Letters worden gerekend als posities A=0..Z=25 met modulo-26 wrap.
//
// Net als bij de cijferpatronen zijn er per niveau meerdere families, zodat
// dezelfde puzzelvorm niet steeds terugkomt. De reeks wordt waar mogelijk zo
// in het alfabet gelegd dat er geen omslag van Z naar A nodig is; lukt dat
// niet (bij grote stappen), dan wijst de uitleg de gebruiker daarop.

import type { Item } from '../engine/types';
import { randInt, pick, buildOptions } from './random';
import { stepLabel } from './format';
import { STRATEGY_HINTS } from './hints';

const A = 65;

export function letterAt(index: number): string {
  const wrapped = ((index % 26) + 26) % 26;
  return String.fromCharCode(A + wrapped);
}

function indexOfLetter(letter: string): number {
  return letter.charCodeAt(0) - A;
}

export type LetterFamily =
  | 'step' // constante stap vooruit of achteruit
  | 'changingStep' // stap die groter of kleiner wordt
  | 'alternating' // twee stappen vooruit die elkaar afwisselen
  | 'zigzag' // afwisselend vooruit en achteruit
  | 'interwoven' // twee verweven reeksen
  | 'interwovenTriple' // drie verweven reeksen
  | 'mirror' // een reeks vanaf het begin en een vanaf het eind van het alfabet
  | 'pairs' // letterparen die met een vaste stap opschuiven
  | 'pairsMirror' // letterparen waarvan de letters uit elkaar lopen
  | 'fibStep'; // stap is de som van de twee vorige stappen

export interface LetterSeries {
  tokens: string[]; // getoonde reeks; een token is een of twee letters
  answer: string;
  distractors: string[];
  explanation: string;
  // Eerste concrete denkstap voor deze reeks, zonder het antwoord te noemen.
  hint: string;
  family: LetterFamily;
}

// Zet de getoonde letters om naar hun plaats in het alfabet: "E=5, I=9, M=13".
// Dat omzetten is bij letterreeksen bijna altijd de eerste nuttige stap.
function positionList(tokens: string[]): string {
  return tokens.map((t) => `${t}=${indexOfLetter(t) + 1}`).join(', ');
}

// Trekt een getal uit het bereik dat niet gelijk is aan `not`.
function randIntExcept(min: number, max: number, not: number): number {
  let value = randInt(min, max);
  while (value === not) value = randInt(min, max);
  return value;
}

// --- Opbouw van een reeks uit posities ---

interface SeriesInput {
  family: LetterFamily;
  positions: number[]; // posities van de getoonde letters
  answerIndex: number;
  describe: (tokens: string[], answer: string) => string;
  hint: (tokens: string[]) => string; // krijgt het antwoord bewust niet mee
}

function letterSeries({ family, positions, answerIndex, describe, hint }: SeriesInput): LetterSeries {
  const tokens = positions.map(letterAt);
  const answer = letterAt(answerIndex);
  const wraps = [...positions, answerIndex].some((p) => p < 0 || p > 25);
  const wrapNote = wraps ? ' Let op: na Z begint het alfabet weer bij A.' : '';
  return {
    tokens,
    answer,
    distractors: [
      letterAt(answerIndex + 1),
      letterAt(answerIndex - 1),
      letterAt(answerIndex + 2),
      letterAt(answerIndex - 2),
      tokens[tokens.length - 1],
    ],
    explanation: describe(tokens, answer) + wrapNote,
    hint: hint(tokens),
    family,
  };
}

// Een patroon uitgedrukt in posities ten opzichte van de eerste letter. De
// reeks mag daardoor vrij in het alfabet geschoven worden.
interface OffsetPattern {
  family: LetterFamily;
  offsets: number[];
  answerOffset: number;
  describe: (tokens: string[], answer: string) => string;
  hint: (tokens: string[]) => string;
}

// Legt een patroon zo in het alfabet dat er geen omslag nodig is. Past het
// patroon niet binnen 26 letters, dan begint het op A en loopt het door.
function fromOffsets({
  family,
  offsets,
  answerOffset,
  describe,
  hint,
}: OffsetPattern): LetterSeries {
  const all = [...offsets, answerOffset];
  const min = Math.min(...all);
  const span = Math.max(...all) - min;
  const base = span > 25 ? -min : randInt(0, 25 - span) - min;
  return letterSeries({
    family,
    positions: offsets.map((o) => o + base),
    answerIndex: answerOffset + base,
    describe,
    hint,
  });
}

// --- Families ---

function constantStep(step: number): OffsetPattern {
  return {
    family: 'step',
    offsets: [0, step, 2 * step, 3 * step, 4 * step],
    answerOffset: 5 * step,
    describe: (tokens, answer) =>
      `Elke stap is ${stepLabel(step)} in het alfabet. Na ${tokens[4]} volgt ${answer}.`,
    hint: (tokens) =>
      `Zet de letters om naar hun plaats in het alfabet: ${positionList(tokens)}. De sprong tussen twee letters is steeds ${stepLabel(step)}. Zet die sprong nog een keer vanaf ${tokens[4]}.`,
  };
}

// Stap die per keer met `increment` verandert (negatief: de stap wordt kleiner).
function changingStep(firstStep: number, increment: number): OffsetPattern {
  const offsets = [0];
  for (let i = 0; i < 4; i++) offsets.push(offsets[i] + firstStep + i * increment);
  const nextStep = firstStep + 4 * increment;
  const shown = [firstStep, firstStep + increment, firstStep + 2 * increment];
  return {
    family: 'changingStep',
    offsets,
    answerOffset: offsets[4] + nextStep,
    describe: (tokens, answer) =>
      `De stap verandert elke keer met ${stepLabel(increment)}: ${shown
        .map(stepLabel)
        .join(', ')}, ... De volgende stap is ${stepLabel(nextStep)}, dus na ${tokens[4]} volgt ${answer}.`,
    hint: (tokens) =>
      `Zet de letters om naar hun plaats in het alfabet: ${positionList(tokens)}. De sprongen zijn dan ${shown
        .map(stepLabel)
        .join(', ')}, ... Die blijven niet gelijk, maar veranderen zelf steeds even veel. Bepaal eerst de volgende sprong.`,
  };
}

// Twee stappen die elkaar om en om afwisselen. Met een negatieve tweede stap
// levert dit een reeks op die heen en weer gaat (zigzag).
function twoStepCycle(first: number, second: number, family: LetterFamily): OffsetPattern {
  const offsets = [0];
  for (let i = 0; i < 4; i++) offsets.push(offsets[i] + (i % 2 === 0 ? first : second));
  return {
    family,
    offsets,
    answerOffset: offsets[4] + first,
    describe: (tokens, answer) =>
      `De stappen wisselen elkaar af: ${stepLabel(first)}, ${stepLabel(second)}, ${stepLabel(first)}, ${stepLabel(second)}, ... De volgende stap is ${stepLabel(first)}, dus na ${tokens[4]} volgt ${answer}.`,
    hint: (tokens) =>
      `Zet de letters om naar hun plaats in het alfabet: ${positionList(tokens)}. De sprongen zijn ${stepLabel(first)}, ${stepLabel(second)}, ${stepLabel(first)}, ${stepLabel(second)}: er wisselen dus twee sprongen elkaar af. Welke van de twee is nu aan de beurt?`,
  };
}

// Twee verweven reeksen. De gevraagde letter hoort altijd bij de eerste reeks
// (de oneven posities), zodat het antwoord eenduidig is.
function interwovenPair(stepA: number, gap: number, stepB: number): OffsetPattern {
  return {
    family: 'interwoven',
    offsets: [0, gap, stepA, gap + stepB, 2 * stepA, gap + 2 * stepB],
    answerOffset: 3 * stepA,
    describe: (tokens, answer) =>
      `Twee verweven reeksen. De oneven posities lopen ${stepLabel(stepA)} (${tokens[0]}, ${tokens[2]}, ${tokens[4]}, ...), de even posities ${stepLabel(stepB)}. De gevraagde letter hoort bij de eerste reeks: na ${tokens[4]} volgt ${answer}.`,
    hint: (tokens) =>
      `De letters springen heen en weer, want er staan twee reeksen door elkaar. Kijk alleen naar de 1e, 3e en 5e letter: ${tokens[0]}, ${tokens[2]}, ${tokens[4]}. Dat is een nette reeks op zichzelf, en de gevraagde letter hoort daarbij.`,
  };
}

// Drie verweven reeksen: elke derde letter hoort bij dezelfde reeks.
function interwovenTriple(): OffsetPattern {
  // Reeks A is de gevraagde reeks; met stap 1 zou het antwoord te makkelijk
  // af te lezen zijn.
  const stepA = randInt(2, 3);
  const stepB = randInt(1, 3);
  const stepC = randInt(1, 3);
  const gapB = randInt(4, 7);
  const gapC = randInt(9, 12);
  return {
    family: 'interwovenTriple',
    offsets: [
      0,
      gapB,
      gapC,
      stepA,
      gapB + stepB,
      gapC + stepC,
      2 * stepA,
      gapB + 2 * stepB,
      gapC + 2 * stepC,
    ],
    answerOffset: 3 * stepA,
    describe: (tokens, answer) =>
      `Drie verweven reeksen: elke derde letter hoort bij dezelfde reeks. De eerste reeks is ${tokens[0]}, ${tokens[3]}, ${tokens[6]} en loopt ${stepLabel(stepA)}. De gevraagde letter hoort daarbij: na ${tokens[6]} volgt ${answer}.`,
    hint: (tokens) =>
      `Twee reeksen door elkaar levert hier niets op, probeer er drie. Kijk alleen naar de 1e, 4e en 7e letter: ${tokens[0]}, ${tokens[3]}, ${tokens[6]}. De gevraagde letter hoort bij die reeks.`,
  };
}

// Een reeks die vooraan in het alfabet begint, verweven met een reeks die
// achteraan begint en terugloopt.
function mirrorPair(forwardMin: number, forwardMax: number): LetterSeries {
  const stepForward = randInt(forwardMin, forwardMax);
  const stepBack = randInt(1, 3);
  const startForward = randInt(0, 2);
  const startBack = randInt(23, 25);
  const positions = [
    startForward,
    startBack,
    startForward + stepForward,
    startBack - stepBack,
    startForward + 2 * stepForward,
    startBack - 2 * stepBack,
  ];
  return letterSeries({
    family: 'mirror',
    positions,
    answerIndex: startForward + 3 * stepForward,
    describe: (tokens, answer) =>
      `De oneven posities beginnen vooraan in het alfabet en lopen ${stepLabel(stepForward)} (${tokens[0]}, ${tokens[2]}, ${tokens[4]}, ...), de even posities beginnen achteraan en lopen ${stepLabel(-stepBack)} (${tokens[1]}, ${tokens[3]}, ${tokens[5]}, ...). De gevraagde letter hoort bij de eerste reeks: na ${tokens[4]} volgt ${answer}.`,
    hint: (tokens) =>
      `Hier staan twee reeksen door elkaar die elkaar vanaf beide uiteinden van het alfabet tegemoet komen. De 1e, 3e en 5e letter (${tokens[0]}, ${tokens[2]}, ${tokens[4]}) beginnen vooraan en lopen vooruit; de 2e, 4e en 6e (${tokens[1]}, ${tokens[3]}, ${tokens[5]}) beginnen achteraan en lopen terug. Volg alleen de eerste reeks.`,
  });
}

interface PairOptions {
  first: number; // positie van de eerste letter van het eerste paar
  firstStep: number;
  second: number; // positie van de tweede letter van het eerste paar
  secondStep: number;
  family: LetterFamily;
  describe: (tokens: string[], answer: string) => string;
  hint: (tokens: string[]) => string;
}

// Reeks van letterparen, bijvoorbeeld AB, DE, GH, ...
function letterPairs({
  first,
  firstStep,
  second,
  secondStep,
  family,
  describe,
  hint,
}: PairOptions): LetterSeries {
  const pairAt = (i: number): string =>
    letterAt(first + i * firstStep) + letterAt(second + i * secondStep);
  const tokens = Array.from({ length: 5 }, (_, i) => pairAt(i));
  const answerFirst = first + 5 * firstStep;
  const answerSecond = second + 5 * secondStep;
  const answer = letterAt(answerFirst) + letterAt(answerSecond);
  return {
    tokens,
    answer,
    distractors: [
      letterAt(answerFirst + 1) + letterAt(answerSecond + 1),
      letterAt(answerFirst - 1) + letterAt(answerSecond - 1),
      letterAt(answerFirst) + letterAt(answerSecond + 1),
      letterAt(answerFirst + 1) + letterAt(answerSecond),
      tokens[4],
    ],
    explanation: describe(tokens, answer),
    hint: hint(tokens),
    family,
  };
}

// Paren van twee opeenvolgende letters die met een vaste stap opschuiven.
function steppingPairs(stepMin: number, stepMax: number, innerMax: number): LetterSeries {
  const step = randInt(stepMin, stepMax);
  const inner = randInt(1, innerMax);
  const first = randInt(0, Math.max(0, 24 - inner - 5 * step));
  return letterPairs({
    first,
    firstStep: step,
    second: first + inner,
    secondStep: step,
    family: 'pairs',
    describe: (tokens, answer) =>
      `Beide letters van het paar schuiven ${stepLabel(step)} op; binnen een paar zit steeds ${inner} stap${inner === 1 ? '' : 'pen'} verschil. Na ${tokens[4]} volgt ${answer}.`,
    hint: (tokens) =>
      `Behandel de twee letters van elk blokje apart. De eerste letters vormen samen een reeks: ${tokens.map((t) => t[0]).join(', ')}. Zoek daar de sprong in, en doe daarna hetzelfde met de tweede letters.`,
  });
}

// Paren waarvan de eerste letter vooruit loopt en de tweede achteruit.
function divergingPairs(): LetterSeries {
  const firstStep = randInt(1, 3);
  const secondStep = randInt(1, 3);
  return letterPairs({
    first: randInt(0, 25 - 5 * firstStep),
    firstStep,
    second: randInt(5 * secondStep, 25),
    secondStep: -secondStep,
    family: 'pairsMirror',
    describe: (tokens, answer) =>
      `De eerste letter van elk paar loopt ${stepLabel(firstStep)}, de tweede loopt ${stepLabel(-secondStep)}. Na ${tokens[4]} volgt ${answer}.`,
    hint: (tokens) =>
      `Behandel de twee letters van elk blokje apart. De eerste letters zijn ${tokens.map((t) => t[0]).join(', ')} en de tweede ${tokens.map((t) => t[1]).join(', ')}. Let op: die twee reeksen lopen niet dezelfde kant op.`,
  });
}

// Beginstappen die binnen het alfabet passen wanneer ze fibonacci-gewijs
// oplopen (grotere startstappen zouden voorbij Z schieten).
const FIB_STEP_STARTS: readonly (readonly [number, number])[] = [
  [1, 1],
  [1, 2],
  [2, 1],
];

// Stap die de som is van de twee vorige stappen.
function fibonacciSteps(a: number, b: number): OffsetPattern {
  const steps = [a, b];
  for (let i = 2; i < 5; i++) steps.push(steps[i - 1] + steps[i - 2]);
  const offsets = [0];
  for (let i = 0; i < 4; i++) offsets.push(offsets[i] + steps[i]);
  return {
    family: 'fibStep',
    offsets,
    answerOffset: offsets[4] + steps[4],
    describe: (tokens, answer) =>
      `Elke stap is de som van de twee vorige stappen: ${steps
        .slice(0, 4)
        .map(stepLabel)
        .join(', ')}, ... De volgende stap is ${stepLabel(steps[4])}, dus na ${tokens[4]} volgt ${answer}.`,
    hint: (tokens) =>
      `Zet de letters om naar hun plaats in het alfabet: ${positionList(tokens)}. De sprongen zijn ${steps
        .slice(0, 4)
        .map(stepLabel)
        .join(', ')}. Die sprongen volgen zelf een patroon: tel er eens twee die naast elkaar staan bij elkaar op.`,
  };
}

// --- Niveau-indeling ---
//
// Niveau 1 en 2 blijven toegankelijk als instap; vanaf niveau 3 lopen zowel het
// aantal families als de zwaarte op.

const strategiesByLevel: Record<number, (() => LetterSeries)[]> = {
  1: [
    () => fromOffsets(constantStep(randInt(1, 4))),
    () => fromOffsets(constantStep(-randInt(1, 4))),
    () => steppingPairs(2, 3, 1),
  ],
  2: [
    // Stap 5 is de grootste die nog binnen A..Z past voor een reeks van zes.
    () => fromOffsets(constantStep(randInt(4, 5))),
    () => fromOffsets(constantStep(-randInt(4, 5))),
    () => fromOffsets(changingStep(1, 1)),
    () => fromOffsets(twoStepCycle(randInt(1, 2), randInt(3, 4), 'alternating')),
  ],
  3: [
    () => fromOffsets(changingStep(randInt(2, 3), 1)),
    () => {
      // Stap die kleiner wordt maar positief blijft.
      const decrement = randInt(1, 2);
      return fromOffsets(changingStep(randInt(4 * decrement + 1, 4 * decrement + 3), -decrement));
    },
    () => fromOffsets(twoStepCycle(randInt(2, 4), randInt(5, 7), 'alternating')),
    () => {
      const stepA = randInt(2, 4);
      return fromOffsets(interwovenPair(stepA, randInt(9, 13), randIntExcept(2, 4, stepA)));
    },
    () => steppingPairs(3, 4, 2),
  ],
  4: [
    () => fromOffsets(changingStep(1, 2)),
    () => {
      const up = randInt(3, 6);
      return fromOffsets(twoStepCycle(up, -randIntExcept(1, 4, up), 'zigzag'));
    },
    () => fromOffsets(interwovenPair(randInt(2, 4), randInt(14, 20), -randInt(2, 4))),
    () => mirrorPair(1, 3),
    divergingPairs,
  ],
  5: [
    () => {
      const [a, b] = pick(FIB_STEP_STARTS);
      return fromOffsets(fibonacciSteps(a, b));
    },
    () => fromOffsets(interwovenTriple()),
    () => fromOffsets(twoStepCycle(randInt(2, 4), -randInt(5, 8), 'zigzag')),
    () => fromOffsets(interwovenPair(randInt(4, 6), randInt(14, 20), -randInt(4, 6))),
    () => mirrorPair(2, 4),
    divergingPairs,
  ],
};

// Bouwt de reeks voor een gegeven niveau (1..5). Exporteerbaar voor tests.
export function buildLetterSeries(level: number): LetterSeries {
  const clamped = Math.min(5, Math.max(1, Math.round(level)));
  return pick(strategiesByLevel[clamped])();
}

let counter = 0;

export function generateLetters(level: number): Item {
  const clamped = Math.min(5, Math.max(1, Math.round(level)));
  const series = buildLetterSeries(clamped);
  const { options, correctIndex } = buildOptions(series.answer, series.distractors);
  counter += 1;
  return {
    id: `letters-${clamped}-${counter}`,
    category: 'letters',
    level: clamped,
    prompt: `Welke letter${series.answer.length > 1 ? 's komen' : ' komt'} er op de plek van het vraagteken?\n\n${series.tokens.join(', ')}, ?`,
    options,
    correctIndex,
    explanation: series.explanation,
    hint: { strategy: STRATEGY_HINTS.letters, step: series.hint },
  };
}

// Hulpfunctie voor tests: bepaalt de positie van een letter.
export { indexOfLetter };

// Cijferpatronen: procedureel gegenereerde getallenreeksen op niveau 1..6.
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

import { MAX_LEVEL, MIN_LEVEL, type Item, type ItemForm } from '../engine/types';
import { randInt, pick, shuffle, buildOptions } from './random';
import { stepLabel } from './format';
import { STRATEGY_HINTS } from './hints';

export type NumericFamily =
  | 'arithmetic' // constante stap (+ of -), mag door nul heen
  | 'geometric' // constante factor (mag negatief zijn)
  | 'divide' // constante deler
  | 'arithmetic2' // veranderende stap (oplopend of aflopend)
  | 'zigzag' // afwisselend +a en -b
  | 'interwoven' // twee verweven reeksen
  | 'interwoven3' // drie verweven reeksen
  | 'interwovengeo' // verweven: de eerste reeks vermenigvuldigt, de tweede telt op
  | 'geodiff' // de verschillen worden telkens een vast aantal keer zo groot
  | 'products' // product van twee opeenvolgende getallen
  | 'tribonacci' // som van de drie voorgaande
  | 'fibminus' // vorige min de term daarvoor
  | 'recursive' // vorige x m + c (c mag negatief zijn)
  | 'altops' // afwisselend x en + (of -)
  | 'altmuldiv' // afwisselend x en : , netto groeiend
  | 'squares' // kwadraten, eventueel met vaste verschuiving
  | 'cubes' // derdemachten, eventueel met vaste verschuiving
  | 'powers' // machten van 2 of 3, met vaste verschuiving
  | 'fibonacci' // som van de twee voorgaande
  | 'primes' // opeenvolgende priemgetallen
  | 'opcycle3' // drie bewerkingen die elkaar in vaste volgorde afwisselen
  | 'posstep' // stap die afhangt van de plaats in de reeks (n x n)
  | 'thirdorder'; // pas de verschillen van de verschillen van de verschillen zijn vast

export interface NumericSeries {
  terms: number[];
  answer: number;
  explanation: string;
  // Eerste concrete denkstap voor deze reeks, zonder het antwoord te noemen.
  hint: string;
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

// Opeenvolgende verschillen van een rij.
function differences(values: number[]): number[] {
  return values.slice(1).map((v, i) => v - values[i]);
}

// Somt de verschillen tussen opeenvolgende termen op: "+4, +4, +4, +4".
function diffList(terms: number[]): string {
  return differences(terms).map(stepLabel).join(', ');
}

// Nederlandse rangwoorden voor rijen, kolommen en plekken in een rij.
const ORDINALS = ['eerste', 'tweede', 'derde', 'vierde', 'vijfde', 'zesde', 'zevende'];

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

// Zet haakjes om een negatief getal, zodat "-4 - -9" leesbaar blijft als
// "(-4) - (-9)".
function paren(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
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
    hint: `De verschillen tussen de getallen zijn ${diffList(terms)}. Dat verschil blijft dus steeds hetzelfde. Zet die stap nog een keer, vanaf ${terms[4]}.`,
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

// Stijgende reeks die onder nul begint en er halverwege door heen komt.
function arithmeticFromNegative(stepMin: number, stepMax: number): NumericSeries {
  const step = randInt(stepMin, stepMax);
  return arithmetic({ start: -randInt(2 * step, 4 * step), step });
}

// Reeks van ronde getallen (tientallen of kwartjes), oplopend of aflopend. Even
// makkelijk als de kleine reeksen, maar het beeld op het scherm is heel anders.
function arithmeticRound(unit: number, maxSteps: number): NumericSeries {
  const step = unit * randInt(1, maxSteps);
  const up = pick([true, false]);
  // Bij een dalende reeks start hoog genoeg dat alle termen positief blijven.
  const start = up ? unit * randInt(1, 9) : step * randInt(6, 10);
  return arithmetic({ start, step: up ? step : -step });
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
    hint: `Optellen levert hier geen vast verschil op, dus probeer te delen: ${terms[1]} : ${terms[0]} = ${ratio} en ${terms[2]} : ${terms[1]} = ${ratio}. Elke term is dus de vorige keer ${ratio}.${signHint}`,
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
  // Een eindantwoord vanaf 4 houdt de reeks weg bij de triviale afloop op 1 en
  // voorkomt dat het antwoord toevallig gelijk is aan de deler.
  const answer = randInt(4, 7);
  const start = answer * divisor ** 5;
  const terms = Array.from({ length: 5 }, (_, i) => start / divisor ** i);
  return {
    terms,
    answer,
    explanation: `Elke term is de vorige gedeeld door ${divisor}. ${terms[4]} : ${divisor} = ${answer}.`,
    hint: `De getallen worden steeds kleiner, maar niet met een vast verschil. Probeer te delen: ${terms[0]} : ${terms[1]} = ${divisor}. Dat gaat elke stap zo.`,
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
    hint: `De verschillen tussen de getallen zijn ${diffList(terms)}. Die verschillen zijn niet gelijk, maar vormen zelf een keurige reeks. Bepaal eerst wat de volgende stap wordt en pas die daarna toe op ${terms[4]}.`,
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
    hint: `De reeks gaat om en om omhoog en omlaag: de verschillen zijn ${diffList(terms)}. Er zijn dus twee stappen die elkaar afwisselen. Welke van de twee is nu aan de beurt?`,
    family: 'zigzag',
  };
}

interface InterwovenOptions {
  startA: number;
  stepA: number;
  startB: number;
  stepB: number; // negatief = de tweede reeks daalt, 0 = hij blijft gelijk
  ask?: 0 | 1; // welke van de twee reeksen gevraagd wordt; standaard willekeurig
}

// Twee reeksen die om en om staan. Welke reeks gevraagd wordt wisselt: hoorde
// het vraagteken altijd bij reeks A, dan was de opgave een stuk makkelijker
// zodra je dat doorhad. Bij een vraag naar reeks B staat er een term van reeks
// A extra, zodat het vraagteken op een even positie valt.
function interwoven({ startA, stepA, startB, stepB, ask }: InterwovenOptions): NumericSeries {
  const which: 0 | 1 = ask ?? (randInt(0, 1) as 0 | 1);
  const a = [0, 1, 2, 3].map((i) => startA + i * stepA);
  const b = [0, 1, 2, 3].map((i) => startB + i * stepB);
  const terms =
    which === 0
      ? [a[0], b[0], a[1], b[1], a[2], b[2]]
      : [a[0], b[0], a[1], b[1], a[2], b[2], a[3]];
  const answer = which === 0 ? a[3] : b[3];
  const seriesB =
    stepB === 0 ? `de even posities blijven ${startB}` : `de even posities lopen ${stepLabel(stepB)}`;
  const shared = `Twee verweven reeksen. De oneven posities lopen ${stepLabel(stepA)} (${a[0]}, ${a[1]}, ${a[2]}, ...), ${seriesB}.`;
  return {
    terms,
    answer,
    explanation:
      which === 0
        ? `${shared} Het gevraagde getal hoort bij de eerste reeks: ${applied(a[2], stepA)}.`
        : `${shared} Het gevraagde getal hoort bij de tweede reeks: ${applied(b[2], stepB)}.`,
    hint:
      which === 0
        ? `Deze reeks springt heen en weer, want er staan twee reeksen door elkaar. Kijk alleen naar de 1e, 3e en 5e positie: ${a[0]}, ${a[1]}, ${a[2]}. Dat is een nette reeks op zichzelf, en het gevraagde getal hoort daarbij.`
        : `Deze reeks springt heen en weer, want er staan twee reeksen door elkaar. Kijk alleen naar de 2e, 4e en 6e positie: ${b[0]}, ${b[1]}, ${b[2]}. Dat is een nette reeks op zichzelf, en het gevraagde getal hoort daarbij.`,
    family: 'interwoven',
    // De voortzetting van de andere reeks is hier de klassieke valkuil.
    distractors:
      which === 0
        ? [b[3], answer + stepA, answer - stepA, answer + 1, answer - 1]
        : [a[3] + stepA, answer + stepB, answer - stepB, answer + 1, answer - 1],
  };
}

interface Interwoven3Options {
  startA: number;
  stepA: number;
  startB: number;
  stepB: number;
  startC: number;
  stepC: number;
  ask?: 0 | 1 | 2; // welke van de drie reeksen gevraagd wordt
}

// Drie reeksen die om en om staan: elk derde getal hoort bij dezelfde reeks.
// Welke reeks gevraagd wordt wisselt; de rij is daarom 9, 10 of 11 termen lang,
// zodat het vraagteken precies op de plek van de gevraagde reeks valt.
function interwoven3(o: Interwoven3Options): NumericSeries {
  const which = o.ask ?? (randInt(0, 2) as 0 | 1 | 2);
  const starts = [o.startA, o.startB, o.startC];
  const steps = [o.stepA, o.stepB, o.stepC];
  const total = 9 + which; // het vraagteken staat op index `total`, en total % 3 = which
  const terms = Array.from(
    { length: total },
    (_, i) => starts[i % 3] + Math.floor(i / 3) * steps[i % 3],
  );
  // Aantal getoonde termen van een reeks; de volgende term is de voortzetting.
  const shown = (s: number): number => Math.ceil((total - s) / 3);
  const answer = starts[which] + shown(which) * steps[which];
  const own = [0, 1, 2].map((i) => starts[which] + i * steps[which]);
  const places = [which + 1, which + 4, which + 7];
  return {
    terms,
    answer,
    explanation: `Drie verweven reeksen: elk derde getal hoort bij dezelfde reeks. Ze lopen ${stepLabel(steps[0])}, ${stepLabel(steps[1])} en ${stepLabel(steps[2])}. Het gevraagde getal hoort bij de reeks op de ${places.join('e, ')}e plek (${own.join(', ')}): ${applied(own[2], steps[which])}.`,
    hint: `Twee reeksen door elkaar levert hier niets op, probeer er drie. Kijk alleen naar het ${places.join('e, ')}e getal: ${own.join(', ')}. Dat is een nette reeks op zichzelf, en het gevraagde getal hoort daarbij.`,
    family: 'interwoven3',
    // De voortzetting van een van de andere reeksen is hier de valkuil.
    distractors: [
      ...[0, 1, 2].filter((s) => s !== which).map((s) => starts[s] + shown(s) * steps[s]),
      answer + steps[which],
      answer + 1,
      answer - 1,
    ],
  };
}

// Bouwt drie verweven reeksen met onderling verschillende stappen, zodat er
// maar een lezing van de reeks mogelijk is.
function interwoven3In(range: { startMin: number; startMax: number }): NumericSeries {
  const stepA = randInt(3, 9);
  const stepB = -randInt(3, 9);
  let stepC = randInt(2, 10);
  while (stepC === stepA) stepC = randInt(2, 10);
  return interwoven3({
    startA: randInt(range.startMin, range.startMax),
    stepA,
    startB: randInt(40, 80),
    stepB,
    startC: randInt(range.startMin, range.startMax),
    stepC,
  });
}

// Verweven reeks waarvan de eerste reeks vermenigvuldigt en de tweede optelt.
// De twee reeksen vragen dus om een verschillende bewerking; dat maakt hem
// zwaarder dan twee verweven reeksen met een vaste stap.
function interwovenGeo(): NumericSeries {
  const which = randInt(0, 1) as 0 | 1;
  const ratio = pick([2, 3]);
  const startA = randInt(2, 5);
  const startB = randInt(40, 80);
  const stepB = -randInt(5, 12);
  const a = [0, 1, 2, 3].map((i) => startA * ratio ** i);
  const b = [0, 1, 2, 3].map((i) => startB + i * stepB);
  const terms =
    which === 0
      ? [a[0], b[0], a[1], b[1], a[2], b[2]]
      : [a[0], b[0], a[1], b[1], a[2], b[2], a[3]];
  const answer = which === 0 ? a[3] : b[3];
  const shared = `Twee verweven reeksen. De oneven posities gaan telkens keer ${ratio} (${a[0]}, ${a[1]}, ${a[2]}, ...), de even posities lopen ${stepLabel(stepB)}.`;
  return {
    terms,
    answer,
    explanation:
      which === 0
        ? `${shared} Het gevraagde getal hoort bij de eerste reeks: ${a[2]} x ${ratio} = ${answer}.`
        : `${shared} Het gevraagde getal hoort bij de tweede reeks: ${applied(b[2], stepB)}.`,
    hint:
      which === 0
        ? `Deze reeks springt heen en weer, want er staan twee reeksen door elkaar. Kijk alleen naar de 1e, 3e en 5e positie: ${a[0]}, ${a[1]}, ${a[2]}. Let op: die reeks heeft geen vaste stap, dus probeer daar te delen. Het gevraagde getal hoort bij die reeks.`
        : `Deze reeks springt heen en weer, want er staan twee reeksen door elkaar. Kijk alleen naar de 2e, 4e en 6e positie: ${b[0]}, ${b[1]}, ${b[2]}. Dat is een nette reeks op zichzelf, en het gevraagde getal hoort daarbij.`,
    family: 'interwovengeo',
    distractors:
      which === 0
        ? [b[3], a[2] * (ratio + 1), a[2] + (a[2] - a[1]), answer + ratio]
        : [a[3] * ratio, answer + stepB, answer - stepB, answer + 1, answer - 1],
  };
}

interface GeoDiffOptions {
  start: number;
  firstDiff: number;
  ratio: number; // waarmee het verschil elke stap groeit
}

// Reeks waarvan niet de getallen zelf, maar de verschillen een vaste factor
// hebben: 4, 7, 13, 25, 49, ... Het startgetal is vrij gekozen, dus er zijn
// geen herkenbare machten zichtbaar; dat maakt hem lastiger dan een machtreeks.
function geoDiff({ start, firstDiff, ratio }: GeoDiffOptions): NumericSeries {
  const terms = [start];
  let diff = firstDiff;
  for (let i = 0; i < 4; i++) {
    terms.push(terms[i] + diff);
    diff *= ratio;
  }
  const answer = terms[4] + diff;
  return {
    terms,
    answer,
    explanation: `De verschillen worden elke keer ${ratio} keer zo groot: ${diffList(terms)}, ... De volgende stap is ${stepLabel(diff)}, dus ${applied(terms[4], diff)}.`,
    hint: `De verschillen tussen de getallen zijn ${diffList(terms)}. Die stappen blijven niet gelijk en lopen ook niet met een vast bedrag op. Deel ze eens door elkaar: ${firstDiff * ratio} : ${firstDiff}. Bepaal zo eerst de volgende stap.`,
    family: 'geodiff',
    // De stap gelijk houden of een stap te ver springen zijn de valkuilen.
    distractors: [terms[4] + diff / ratio, terms[4] + diff * ratio, answer + ratio, answer + 1],
  };
}

// Producten van twee opeenvolgende getallen: 6, 12, 20, 30, 42, ...
function products(): NumericSeries {
  const first = randInt(2, 4);
  const factor = (i: number): number => first + i;
  const terms = Array.from({ length: 5 }, (_, i) => factor(i) * (factor(i) + 1));
  const n = factor(5);
  const answer = n * (n + 1);
  return {
    terms,
    answer,
    explanation: `Elk getal is het product van twee opeenvolgende getallen: ${terms
      .map((_, i) => `${factor(i)} x ${factor(i) + 1}`)
      .join(', ')}, ... De volgende is ${n} x ${n + 1} = ${answer}.`,
    hint: `De verschillen zijn ${diffList(terms)}: die lopen steeds met 2 op. Probeer elk getal te schrijven als een vermenigvuldiging van twee getallen die vlak naast elkaar liggen; kijk daarvoor eerst naar ${terms[0]} en daarna naar ${terms[1]}.`,
    family: 'products',
    // Kwadraten in plaats van producten, of het verschil gelijk houden.
    distractors: [terms[4] + (terms[4] - terms[3]), n * n, (n + 1) * (n + 2), answer + 2],
  };
}

// Som van de drie voorgaande termen. Zwaarder dan Fibonacci, omdat twee
// getallen optellen hier juist niet uitkomt.
function tribonacci(): NumericSeries {
  const a = randInt(1, 4);
  const b = randInt(1, 5);
  // c mag niet de som van a en b zijn: dan lijkt het begin op Fibonacci.
  const c = randIntExcept(b + 1, b + 6, a + b);
  const all = [a, b, c];
  for (let i = 3; i < 6; i++) all.push(all[i - 1] + all[i - 2] + all[i - 3]);
  const terms = all.slice(0, 5);
  return {
    terms,
    answer: all[5],
    explanation: `Elke term is de som van de drie voorgaande: ${terms[2]} + ${terms[3]} + ${terms[4]} = ${all[5]}.`,
    hint: `Er is geen vaste stap en geen vaste factor, en twee getallen naast elkaar optellen levert het volgende getal niet op. Probeer er eens drie: ${terms[0]} + ${terms[1]} + ${terms[2]}. Kijk of dat verderop ook opgaat.`,
    family: 'tribonacci',
    // De Fibonacci-lezing (twee optellen) is hier de klassieke valkuil.
    distractors: [terms[3] + terms[4], all[5] + terms[2], all[5] + 1, all[5] - 1],
  };
}

// Elke term is de vorige min de term daarvoor. De reeks zakt daardoor door nul
// en herhaalt zich pas na zes termen.
function fibMinus(): NumericSeries {
  const a = randInt(6, 15);
  const b = randInt(1, a - 1); // kleiner dan a, dus de derde term wordt negatief
  const terms = [a, b];
  for (let i = 2; i < 5; i++) terms.push(terms[i - 1] - terms[i - 2]);
  const answer = terms[4] - terms[3];
  return {
    terms,
    answer,
    explanation: `Elke term is de vorige min de term daarvoor: ${paren(terms[4])} - ${paren(terms[3])} = ${answer}.`,
    hint: `De reeks zakt eerst door nul en klimt daarna weer, zonder vaste stap of factor. Trek eens twee getallen van elkaar af in plaats van ze op te tellen: ${paren(terms[1])} - ${paren(terms[0])} geeft precies het getal dat erna komt. Kijk of dat verderop ook opgaat.`,
    family: 'fibminus',
    // Optellen in plaats van aftrekken, of het teken omdraaien.
    distractors: [terms[4] + terms[3], -answer, answer + 1, answer - 1],
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
    hint: `De reeks groeit te snel voor optellen, maar delen geeft geen rond getal. Er gebeuren hier twee dingen na elkaar. Probeer eens: ${terms[0]} x ${multiplier} = ${terms[0] * multiplier}, en kijk wat je daar nog bij moet doen om op ${terms[1]} uit te komen.`,
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
    hint: `Er wisselen hier twee verschillende bewerkingen elkaar af. Van ${terms[0]} naar ${terms[1]} is een grote sprong, van ${terms[1]} naar ${terms[2]} een kleine. Bepaal welke van de twee nu aan de beurt is.`,
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

// Machtreeksen (kwadraten, derdemachten, machten van 2) zijn de zwaarste vorm
// die de generator kent. Ze blijven daarom bewust klein van getal: lage
// startexponenten en een kleine verschuiving, zodat het patroon te herkennen is
// zonder grote hoofdrekensommen.

// Afwisselend keer en gedeeld door, met een factor die groter is dan de deler:
// de reeks springt dus op en neer maar groeit netto. Bijvoorbeeld 3, 12, 6, 24,
// 12, ? met x4 en :2. De deler is altijd een deler van de factor, zodat alle
// termen hele getallen blijven.
const MUL_DIV_PAIRS = [
  { multiplier: 4, divisor: 2 },
  { multiplier: 6, divisor: 2 },
  { multiplier: 6, divisor: 3 },
  { multiplier: 9, divisor: 3 },
] as const;

function altMulDiv(pairs: readonly { multiplier: number; divisor: number }[]): NumericSeries {
  const { multiplier, divisor } = pick(pairs);
  const terms = [randInt(2, 6)];
  const ops: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (i % 2 === 0) {
      terms.push(terms[i] * multiplier);
      ops.push(`x${multiplier}`);
    } else {
      terms.push(terms[i] / divisor);
      ops.push(`:${divisor}`);
    }
  }
  const answer = terms[4] * multiplier;
  return {
    terms,
    answer,
    explanation: `De bewerkingen wisselen elkaar af: ${ops.join(', ')}, ... De volgende bewerking is x${multiplier}, dus ${terms[4]} x ${multiplier} = ${answer}.`,
    hint: `De reeks gaat om en om flink omhoog en dan weer omlaag, maar wordt over het geheel groter. Deel eens: ${terms[1]} : ${terms[0]} en daarna ${terms[1]} : ${terms[2]}. Er wisselen twee bewerkingen elkaar af; bepaal welke nu aan de beurt is.`,
    family: 'altmuldiv',
    // De verkeerde bewerking pakken is hier de valkuil.
    distractors: [
      (terms[4] * multiplier) / divisor,
      terms[4] * divisor,
      terms[3] * multiplier,
      answer + multiplier,
    ],
  };
}

function squares(): NumericSeries {
  const first = randInt(2, 3);
  const offset = randInt(-2, 2);
  const terms = Array.from({ length: 5 }, (_, i) => (first + i) ** 2 + offset);
  const n = first + 5;
  return {
    terms,
    answer: n ** 2 + offset,
    explanation: `Dit zijn kwadraten${offsetWord(offset)}: ${terms
      .map((_, i) => shifted(`${first + i}^2`, offset))
      .join(', ')}, ... De volgende is ${shifted(`${n}^2`, offset)} = ${n ** 2 + offset}.`,
    hint: `De verschillen zijn ${diffList(terms)}: die lopen steeds met 2 op. Dat gebeurt precies bij kwadraten. Kijk of je in ${terms[0]} en ${terms[1]} de kwadraten van twee opeenvolgende getallen herkent.`,
    family: 'squares',
    distractors: [terms[4] + (terms[4] - terms[3]), n ** 2, (n + 1) ** 2 + offset],
  };
}

function cubes(): NumericSeries {
  const first = 2; // 8, 27, 64, 125, 216, ... hoger wordt puur hoofdrekenen
  const offset = randInt(-1, 1);
  const terms = Array.from({ length: 5 }, (_, i) => (first + i) ** 3 + offset);
  const n = first + 5;
  return {
    terms,
    answer: n ** 3 + offset,
    explanation: `Dit zijn derdemachten${offsetWord(offset)}: ${terms
      .map((_, i) => shifted(`${first + i}^3`, offset))
      .join(', ')}, ... De volgende is ${shifted(`${n}^3`, offset)} = ${n ** 3 + offset}.`,
    hint: `De reeks groeit hard, maar niet met een vaste factor. Reken eens ${first} x ${first} x ${first} uit en vergelijk dat met ${terms[0]}. Doe daarna hetzelfde met het volgende getal.`,
    family: 'cubes',
    // Denken dat het verschil gelijk blijft is hier de klassieke fout.
    distractors: [terms[4] + (terms[4] - terms[3]), n ** 3, (n + 1) ** 3 + offset],
  };
}

// Machten met een vaste verschuiving, bijvoorbeeld 1, 3, 7, 15, 31. De
// startexponent blijft bewust laag: machten van 3 lopen binnen vijf termen al
// richting 729, dus die horen pas op het hoogste niveau thuis.
function powers(base: number): NumericSeries {
  const offset = pick([-1, 1]);
  const first = randInt(1, 2);
  const terms = Array.from({ length: 5 }, (_, i) => base ** (first + i) + offset);
  const exponent = first + 5;
  const answer = base ** exponent + offset;
  return {
    terms,
    answer,
    explanation: `Dit zijn machten van ${base}${offsetWord(offset)}: ${terms
      .map((_, i) => shifted(`${base}^${first + i}`, offset))
      .join(', ')}, ... De volgende is ${shifted(`${base}^${exponent}`, offset)} = ${answer}.`,
    hint: `Elk getal is ongeveer ${base} keer het vorige, maar net niet precies. Kijk wat er gebeurt als je er van elk getal ${Math.abs(offset)} ${offset < 0 ? 'bij optelt' : 'afhaalt'}: dan houd je ronde machten van ${base} over.`,
    family: 'powers',
    // De verschuiving vergeten of verkeerd toepassen, of de stap gelijk houden.
    distractors: [base ** exponent, answer - 2 * offset, terms[4] + (terms[4] - terms[3])],
  };
}

// Met grotere beginwaarden worden de getallen fors en minder rond, terwijl de
// regel dezelfde blijft: dat is precies de bedoeling van "rule complexity".
function fibonacci(seedMin = 1, seedMax = 6): NumericSeries {
  const a = randInt(seedMin, seedMax);
  const b = randInt(a + 1, a + 8);
  const all = [a, b];
  for (let i = 2; i < 6; i++) all.push(all[i - 1] + all[i - 2]);
  const terms = all.slice(0, 5);
  return {
    terms,
    answer: all[5],
    explanation: `Elke term is de som van de twee voorgaande: ${terms[3]} + ${terms[4]} = ${all[5]}.`,
    hint: `Er is hier geen vaste stap en geen vaste factor. Tel eens twee getallen die naast elkaar staan bij elkaar op: ${terms[0]} + ${terms[1]} = ${terms[2]}. Kijk of dat verderop ook opgaat.`,
    family: 'fibonacci',
  };
}

// --- De zwaarste knoppen: aantal regels en rule span ---
//
// Uit onderzoek naar automatische itemgeneratie voor cijferreeksen (Holzman
// 1983; Arendasy & Sommer 2012) komen vier knoppen die de moeilijkheid bepalen:
// het aantal regels, het aantal verweven periodes, het aantal bewerkingen per
// stap (rule span) en de zwaarte van de bewerking zelf. De drie families
// hieronder draaien vooral aan de eerste en de derde knop.

type CycleOp = { kind: 'mul'; value: number } | { kind: 'add'; value: number };

function applyOp(value: number, op: CycleOp): number {
  return op.kind === 'mul' ? value * op.value : value + op.value;
}

function opLabel(op: CycleOp): string {
  return op.kind === 'mul' ? `x${op.value}` : stepLabel(op.value);
}

// Drie bewerkingen die elkaar in vaste volgorde afwisselen, bijvoorbeeld
// x2, +5, -3, x2, +5, -3, ... Er zijn zeven termen te zien: precies twee volle
// rondes, zodat de volgorde af te lezen is en er maar een voortzetting past.
function opCycle3(multipliers: readonly number[]): NumericSeries {
  const multiplier = pick(multipliers);
  const ops: CycleOp[] = shuffle([
    { kind: 'mul', value: multiplier },
    { kind: 'add', value: randInt(3, 9) },
    { kind: 'add', value: -randInt(2, 7) },
  ]);
  // Een te klein startgetal kan de reeks laten inzakken of stil laten staan;
  // dan is de volgorde van de bewerkingen niet meer af te lezen. Groei het
  // startgetal net zo lang tot de reeks netjes oploopt.
  let terms: number[] = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    const start = randInt(6 + attempt * 4, 16 + attempt * 4);
    terms = [start];
    for (let i = 0; i < 6; i++) terms.push(applyOp(terms[i], ops[i % 3]));
    const grows = terms.every((t) => t > 0) && [0, 1, 2, 3].every((i) => terms[i] !== terms[i + 3]);
    if (grows) break;
  }
  const answer = applyOp(terms[6], ops[0]);
  return {
    terms,
    answer,
    explanation: `Er wisselen drie bewerkingen elkaar af, telkens in dezelfde volgorde: ${ops
      .map(opLabel)
      .join(', ')}, ${ops.map(opLabel).join(', ')}, ... Nu is ${opLabel(ops[0])} weer aan de beurt, dus ${
      ops[0].kind === 'mul'
        ? `${terms[6]} x ${ops[0].value} = ${answer}`
        : applied(terms[6], ops[0].value)
    }.`,
    hint: `De verschillen zijn ${diffList(terms)}: geen vaste stap en geen vaste factor. Vergelijk de sprong van ${terms[0]} naar ${terms[1]} eens met die van ${terms[3]} naar ${terms[4]}, en die van ${terms[1]} naar ${terms[2]} met die van ${terms[4]} naar ${terms[5]}. De bewerkingen herhalen zich; bepaal welke nu aan de beurt is.`,
    family: 'opcycle3',
    // De verkeerde bewerking uit de cyclus pakken is hier de valkuil.
    distractors: [
      applyOp(terms[6], ops[1]),
      applyOp(terms[6], ops[2]),
      answer + 1,
      answer - 1,
    ],
  };
}

// De stap hangt af van de plaats in de reeks: stap n is n x n (eventueel maal
// een vaste factor). De verschillen 1, 4, 9, 16 zijn dus zelf een kwadratenrij.
// De variant met stap n x k is bewust weggelaten: die levert een constant
// tweede verschil op en is dan gewoon de bestaande familie arithmetic2.
function posStep(): NumericSeries {
  const k = pick([1, 1, 2, 3]);
  const terms = [randInt(2, 12)];
  for (let i = 1; i <= 4; i++) terms.push(terms[i - 1] + k * i * i);
  const answer = terms[4] + 25 * k;
  const rule = k === 1 ? 'n x n' : `${k} x n x n`;
  return {
    terms,
    answer,
    explanation: `De stap hangt af van de plaats in de reeks: de stap naar term n is ${rule}. De stappen zijn dus ${diffList(terms)}, ... De volgende stap is ${stepLabel(25 * k)}, dus ${applied(terms[4], 25 * k)}.`,
    hint: `De verschillen tussen de getallen zijn ${diffList(terms)}. Die stappen lopen niet met een vast bedrag op en hebben ook geen vaste factor. Herken je in die stappen zelf een bekend rijtje getallen? Bepaal daarmee eerst wat de volgende stap wordt.`,
    family: 'posstep',
    // De stap gelijk houden, of hem laten oplopen met een vast bedrag.
    distractors: [terms[4] + 16 * k, terms[4] + 23 * k, answer + 1, answer - 1],
  };
}

// Derde-orde reeks: pas de verschillen van de verschillen van de verschillen
// zijn constant. Je moet dus drie keer aftrekken voordat het patroon zichtbaar
// wordt; daarom staat deze alleen op het hoogste niveau.
function thirdOrder(): NumericSeries {
  const third = randInt(2, 5);
  const terms = [randInt(2, 15)];
  let first = randInt(2, 8);
  let second = randInt(1, 5);
  for (let i = 0; i < 5; i++) {
    terms.push(terms[i] + first);
    first += second;
    second += third;
  }
  const answer = terms[5] + first;
  const d1 = differences(terms);
  const d2 = differences(d1);
  return {
    terms,
    answer,
    explanation: `Neem de verschillen: ${d1.map(stepLabel).join(', ')}. Neem daarvan opnieuw de verschillen: ${d2
      .map(stepLabel)
      .join(', ')}. En daarvan nog een keer: die zijn allemaal ${stepLabel(third)}. Zo reken je terug dat de volgende stap ${stepLabel(first)} is, dus ${applied(terms[5], first)}.`,
    hint: `Een vaste stap of factor zit er niet in, en ook de verschillen van de verschillen zijn nog niet gelijk: ${d2
      .map(stepLabel)
      .join(', ')}. Neem de verschillen dan een derde keer. Werk van daaruit terug naar de volgende stap.`,
    family: 'thirdorder',
    // Stoppen na een of twee keer aftrekken zijn hier de valkuilen.
    distractors: [
      terms[5] + d1[d1.length - 1],
      terms[5] + d1[d1.length - 1] + d2[d2.length - 1],
      answer + 1,
      answer - 1,
    ],
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
    hint: `De verschillen zijn onregelmatig (${diffList(terms)}), dus er zit geen rekenregel achter. Kijk eens door welke getallen ${terms[1]} en ${terms[2]} deelbaar zijn. Het gaat hier om een bekend rijtje getallen.`,
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
    () => arithmeticRound(10, 2), // tientallen, op en neer
    () => geometric([2], 3), // verdubbelen: even toegankelijk, ander uiterlijk
  ],
  2: [
    () => arithmetic({ start: randInt(1, 9), step: randInt(7, 15) }),
    () => arithmetic({ start: randInt(40, 90), step: randInt(7, 15) }),
    () => arithmeticDown(7, 14),
    () => arithmeticThroughZero(3, 8),
    () => arithmeticRound(25, 2), // kwartjes: 75, 125, 175, ...
    () => geometric([2, 3], 4),
    () => divide([2]), // halveren
  ],
  3: [
    arithmetic2Up,
    arithmetic2Down,
    () => divide([2, 3]),
    () => arithmeticFromNegative(4, 9), // start onder nul, klimt er door heen
    () => arithmeticRound(25, 4), // grotere ronde getallen
    // Verweven reeks waarvan de tweede reeks steeds hetzelfde getal is: een
    // heel ander beeld dan twee lopende reeksen.
    // Vragen naar de constante reeks zou hier neerkomen op "schrijf hetzelfde
    // getal nog een keer op", dus hier is het altijd de lopende reeks.
    () =>
      interwoven({
        startA: randInt(2, 12),
        stepA: randInt(3, 8),
        startB: randInt(2, 40),
        stepB: 0,
        ask: 0,
      }),
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
    primes,
    () => altMulDiv([MUL_DIV_PAIRS[0]]), // x4, :2: de lichtste van de vier
    () => geometric([3, 4], 4),
    () => arithmeticFromNegative(9, 20), // grotere stappen, start onder nul
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
    () => interwoven({
      startA: randInt(1, 9),
      stepA: randInt(4, 11),
      startB: randInt(40, 60),
      stepB: -randInt(6, 12),
    }),
  ],
  5: [
    // De drie machtreeksen delen een plek in de lijst. Zo komt "herken de
    // macht" ongeveer een op de zes vragen voorbij in plaats van drie keer zo
    // vaak, terwijl de variatie binnen die vorm blijft bestaan.
    () => pick([squares, cubes, () => powers(2)])(),
    fibonacci,
    () => altMulDiv(MUL_DIV_PAIRS.slice(1)), // grotere factoren en delers
    () => geometric([-2, -3], 4),
    () => recursiveIn({ startMin: 2, startMax: 5, multipliers: [3, 4], constants: [-3, -5, 5, 7] }),
    interwovenGeo,
    () => geoDiff({ start: randInt(2, 9), firstDiff: randInt(2, 6), ratio: 2 }),
    // Drie regels in plaats van twee, en een stap die van de plek in de reeks
    // afhangt: de twee zwaarste knoppen uit de literatuur.
    () => opCycle3([2]),
    posStep,
    // Dezelfde regels, maar met grotere en minder ronde getallen.
    () => geoDiff({ start: randInt(30, 90), firstDiff: randInt(7, 13), ratio: 2 }),
    () => fibonacci(12, 30),
  ],
  // Niveau 6 is de bovenkant: reeksen waarvan de regel zelf uit twee stappen
  // bestaat, of die pas zichtbaar wordt als je drie termen tegelijk bekijkt.
  6: [
    tribonacci,
    fibMinus,
    products,
    () => interwoven3In({ startMin: 2, startMax: 12 }),
    () => powers(3), // machten van 3: het zwaarste hoofdrekenwerk, dus alleen hier
    () => geoDiff({ start: randInt(2, 9), firstDiff: randInt(2, 5), ratio: 3 }),
    () => recursiveIn({ startMin: 2, startMax: 4, multipliers: [3, 4], constants: [-9, -7, 7, 9] }),
    // Drie regels achter elkaar, met een grotere factor dan op niveau 5.
    () => opCycle3([2, 3]),
    thirdOrder,
    // Grotere, minder ronde getallen bij een regel die al bekend is.
    () =>
      recursiveIn({ startMin: 11, startMax: 19, multipliers: [3, 4], constants: [-13, -11, 11, 13] }),
  ],
};

// Bouwt een reeks voor een gegeven niveau (1..6). Exporteerbaar voor tests.
export function buildNumericSeries(level: number): NumericSeries {
  const clamped = clampLevel(level);
  const strategies = strategiesByLevel[clamped];
  return pick(strategies)();
}

function clampLevel(level: number): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)));
}

// --- Cijfermatrix: getallen in een raster van 3 bij 3 ---
//
// De regel loopt niet van links naar rechts door alles heen, maar binnen elke
// rij of binnen elke kolom apart. Deze vorm staat letterlijk in de oefensets
// van de politie. Er blijven altijd twee volledig gevulde rijen (of kolommen)
// over, zodat de regel af te leiden en te toetsen is.

export type NumericGridFamily =
  | 'gridRowSum' // derde vakje = eerste + tweede
  | 'gridRowDiff' // derde vakje = eerste - tweede
  | 'gridColSum' // onderste vakje = de twee erboven opgeteld
  | 'gridColProduct' // onderste vakje = de twee erboven vermenigvuldigd
  | 'gridRowScaled' // derde vakje = (eerste + tweede) x k
  | 'gridRowMulMinus' // derde vakje = eerste x k - tweede
  | 'gridRowCol' // rij- en kolomregel die tegelijk moeten kloppen
  | 'gridDiagonal'; // de regel wordt pas zichtbaar over de schuine lijnen

export const GRID_COLS = 3;

export interface NumericGridPuzzle {
  cols: number;
  values: number[]; // het volledige raster, rij voor rij
  missing: number; // index van het gevraagde vakje
  answer: number;
  explanation: string;
  hint: string;
  family: NumericGridFamily;
  distractors: number[];
}

type Orientation = 'row' | 'col';

// Haalt rij of kolom `index` uit het raster.
function lineOf(values: number[], orientation: Orientation, index: number): number[] {
  return orientation === 'row'
    ? [values[index * 3], values[index * 3 + 1], values[index * 3 + 2]]
    : [values[index], values[index + 3], values[index + 6]];
}

// Beschrijving van een matrixfamilie waarvan de regel binnen een lijn werkt.
interface GridSpec {
  family: NumericGridFamily;
  orientation: Orientation;
  values: number[];
  ruleText: string;
  // Berekent het ontbrekende vakje uit de twee andere vakjes in de lijn.
  solve: (line: number[], pos: number) => number;
  // Uitgewerkte som voor die plek: "12 + 7 = 19".
  worked: (line: number[], pos: number) => string;
  // Afleider: dezelfde lijn met de verkeerde bewerking.
  wrongOp: (line: number[], pos: number) => number;
}

function fromGridSpec(spec: GridSpec): NumericGridPuzzle {
  const line = randInt(0, 2);
  const pos = randInt(0, 2);
  const missing = spec.orientation === 'row' ? line * 3 + pos : pos * 3 + line;
  const own = lineOf(spec.values, spec.orientation, line);
  const answer = spec.values[missing];
  const across: Orientation = spec.orientation === 'row' ? 'col' : 'row';
  // Wie de regel in de verkeerde richting leest, komt hierop uit.
  const misread = spec.solve(lineOf(spec.values, across, pos), line);
  const unit = spec.orientation === 'row' ? 'rij' : 'kolom';
  const units = spec.orientation === 'row' ? 'rijen' : 'kolommen';
  const others = [0, 1, 2].filter((l) => l !== line).map((l) => lineOf(spec.values, spec.orientation, l));
  return {
    cols: GRID_COLS,
    values: spec.values,
    missing,
    answer,
    explanation: `${spec.ruleText} In de andere ${units} klopt dat: ${others
      .map((l) => spec.worked(l, 2))
      .join(' en ')}. In de ${ORDINALS[line]} ${unit} staat het lege vakje: ${spec.worked(own, pos)}.`,
    hint: `Het lege vakje hoort bij een ${unit}. Kijk eerst naar de twee volledig gevulde ${units}: ${others[0].join(', ')} en ${others[1].join(', ')}. Zoek een bewerking die je van de eerste twee getallen naar het derde brengt en die in allebei opgaat. Pas die regel daarna toe op de ${unit} met het lege vakje.`,
    family: spec.family,
    distractors: [spec.wrongOp(own, pos), misread, answer + 1, answer - 1, answer + 2].filter(
      (v) => Number.isInteger(v),
    ),
  };
}

// Trekt drie lijnen die onderling verschillen. Twee gelijke lijnen zouden het
// antwoord weggeven: dan kun je het lege vakje gewoon overschrijven.
function threeLines(make: () => number[]): number[][] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const lines = [make(), make(), make()];
    const shown = lines.map((line) => line.join(','));
    if (new Set(shown).size === 3) return lines;
  }
  return [make(), make(), make()];
}

// Bouwt een raster uit een regel die per lijn van drie vakjes werkt.
function gridFromLines(orientation: Orientation, lines: number[][]): number[] {
  const values = new Array<number>(9);
  lines.forEach((line, index) => {
    line.forEach((value, pos) => {
      values[orientation === 'row' ? index * 3 + pos : pos * 3 + index] = value;
    });
  });
  return values;
}

function gridSum(orientation: Orientation): NumericGridPuzzle {
  const lines = threeLines(() => {
    const a = randInt(5, 45);
    const b = randInt(2, 30);
    return [a, b, a + b];
  });
  return fromGridSpec({
    family: orientation === 'row' ? 'gridRowSum' : 'gridColSum',
    orientation,
    values: gridFromLines(orientation, lines),
    ruleText:
      orientation === 'row'
        ? 'In elke rij is het derde getal de som van de eerste twee.'
        : 'In elke kolom is het onderste getal de som van de twee erboven.',
    solve: (l, p) => (p === 2 ? l[0] + l[1] : p === 0 ? l[2] - l[1] : l[2] - l[0]),
    worked: (l, p) =>
      p === 2 ? `${l[0]} + ${l[1]} = ${l[2]}` : p === 0 ? `${l[2]} - ${l[1]} = ${l[0]}` : `${l[2]} - ${l[0]} = ${l[1]}`,
    wrongOp: (l, p) => (p === 2 ? l[0] - l[1] : p === 0 ? l[2] + l[1] : l[2] + l[0]),
  });
}

function gridRowDiff(): NumericGridPuzzle {
  const lines = threeLines(() => {
    const a = randInt(15, 60);
    const b = randInt(3, 35);
    return [a, b, a - b];
  });
  return fromGridSpec({
    family: 'gridRowDiff',
    orientation: 'row',
    values: gridFromLines('row', lines),
    ruleText: 'In elke rij is het derde getal het eerste min het tweede.',
    solve: (l, p) => (p === 2 ? l[0] - l[1] : p === 0 ? l[2] + l[1] : l[0] - l[2]),
    worked: (l, p) =>
      p === 2
        ? `${l[0]} - ${l[1]} = ${l[2]}`
        : p === 0
          ? `${paren(l[2])} + ${l[1]} = ${l[0]}`
          : `${l[0]} - ${paren(l[2])} = ${l[1]}`,
    wrongOp: (l, p) => (p === 2 ? l[0] + l[1] : p === 0 ? l[2] - l[1] : l[0] + l[2]),
  });
}

function gridColProduct(): NumericGridPuzzle {
  const lines = threeLines(() => {
    const a = randInt(2, 12);
    const b = randInt(2, 9);
    return [a, b, a * b];
  });
  return fromGridSpec({
    family: 'gridColProduct',
    orientation: 'col',
    values: gridFromLines('col', lines),
    ruleText: 'In elke kolom is het onderste getal het product van de twee erboven.',
    solve: (l, p) => (p === 2 ? l[0] * l[1] : p === 0 ? l[2] / l[1] : l[2] / l[0]),
    worked: (l, p) =>
      p === 2 ? `${l[0]} x ${l[1]} = ${l[2]}` : p === 0 ? `${l[2]} : ${l[1]} = ${l[0]}` : `${l[2]} : ${l[0]} = ${l[1]}`,
    wrongOp: (l, p) => (p === 2 ? l[0] + l[1] : p === 0 ? l[2] - l[1] : l[2] - l[0]),
  });
}

// Twee bewerkingen per stap: eerst optellen, dan vermenigvuldigen. Volgens de
// literatuur is dat de zwaarste knop van allemaal.
function gridRowScaled(): NumericGridPuzzle {
  const k = randInt(2, 4);
  const lines = threeLines(() => {
    const a = randInt(2, 15);
    const b = randInt(1, 12);
    return [a, b, (a + b) * k];
  });
  return fromGridSpec({
    family: 'gridRowScaled',
    orientation: 'row',
    values: gridFromLines('row', lines),
    ruleText: `In elke rij tel je de eerste twee getallen op en vermenigvuldig je die som met ${k}.`,
    solve: (l, p) => (p === 2 ? (l[0] + l[1]) * k : p === 0 ? l[2] / k - l[1] : l[2] / k - l[0]),
    worked: (l, p) =>
      p === 2
        ? `(${l[0]} + ${l[1]}) x ${k} = ${l[2]}`
        : p === 0
          ? `${l[2]} : ${k} - ${l[1]} = ${l[0]}`
          : `${l[2]} : ${k} - ${l[0]} = ${l[1]}`,
    // De vermenigvuldiging vergeten is hier de klassieke fout.
    wrongOp: (l, p) => (p === 2 ? l[0] + l[1] : p === 0 ? l[2] - l[1] : l[2] - l[0]),
  });
}

function gridRowMulMinus(): NumericGridPuzzle {
  const k = randInt(2, 4);
  const lines = threeLines(() => {
    const a = randInt(5, 20);
    const b = randInt(2, 18);
    return [a, b, a * k - b];
  });
  return fromGridSpec({
    family: 'gridRowMulMinus',
    orientation: 'row',
    values: gridFromLines('row', lines),
    ruleText: `In elke rij is het derde getal het eerste keer ${k}, min het tweede.`,
    solve: (l, p) => (p === 2 ? l[0] * k - l[1] : p === 0 ? (l[2] + l[1]) / k : l[0] * k - l[2]),
    worked: (l, p) =>
      p === 2
        ? `${l[0]} x ${k} - ${l[1]} = ${l[2]}`
        : p === 0
          ? `(${paren(l[2])} + ${l[1]}) : ${k} = ${l[0]}`
          : `${l[0]} x ${k} - ${paren(l[2])} = ${l[1]}`,
    // De aftrekking vergeten, of hem de verkeerde kant op doen.
    wrongOp: (l, p) => (p === 2 ? l[0] * k + l[1] : p === 0 ? l[2] + l[1] : l[0] * k + l[2]),
  });
}

// Rij- en kolomregel tegelijk: binnen een rij gaat het keer k, en de kolommen
// lopen met een vaste stap die zelf ook keer k gaat. Je moet dus twee regels
// combineren voordat je het lege vakje kunt invullen.
function gridRowCol(): NumericGridPuzzle {
  const k = pick([2, 3]);
  const base = randInt(2, 9);
  const rowStep = randInt(3, 9);
  const lines = [0, 1, 2].map((r) => [0, 1, 2].map((c) => (base + r * rowStep) * k ** c));
  return fromGridSpec({
    family: 'gridRowCol',
    orientation: 'row',
    values: gridFromLines('row', lines),
    ruleText: `In elke rij wordt elk volgend getal keer ${k}. In de eerste kolom lopen de getallen ${stepLabel(rowStep)}, en dat verschil gaat in elke volgende kolom ook keer ${k}.`,
    solve: (l, p) => (p === 0 ? l[1] / k : p === 1 ? l[0] * k : l[1] * k),
    worked: (l, p) =>
      p === 0 ? `${l[1]} : ${k} = ${l[0]}` : p === 1 ? `${l[0]} x ${k} = ${l[1]}` : `${l[1]} x ${k} = ${l[2]}`,
    // De rij optellen in plaats van vermenigvuldigen.
    wrongOp: (l, p) =>
      p === 0 ? l[1] - (l[2] - l[1]) : p === 1 ? (l[0] + l[2]) / 2 : l[1] + (l[1] - l[0]),
  });
}

// De regel wordt pas zichtbaar over de schuine lijnen: elk vakje hangt alleen
// af van rij plus kolom. De rijen zelf lopen daardoor niet met een vaste stap,
// dus de gebruiker moet het raster echt schuin lezen.
function gridDiagonal(): NumericGridPuzzle {
  const first = randInt(2, 6);
  const grow = randInt(2, 5);
  const f = [randInt(2, 12)];
  for (let i = 0; i < 4; i++) f.push(f[i] + first + i * grow);
  const values = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => f[r + c]));
  // Alleen linksboven en rechtsonder liggen alleen op hun eigen schuine lijn.
  // Op elke andere plek zou je het antwoord van een buurvakje kunnen overnemen.
  const missing = pick([0, 8]);
  const answer = values[missing];
  const steps = [0, 1, 2, 3].map((i) => first + i * grow);
  return {
    cols: GRID_COLS,
    values,
    missing,
    answer,
    explanation: `Elk vakje hangt alleen af van rij plus kolom: op elke schuine lijn van rechtsboven naar linksonder staat hetzelfde getal. Die reeks is ${f.join(', ')} en de stappen daarin lopen telkens ${stepLabel(grow)} op: ${steps
      .map(stepLabel)
      .join(', ')}. ${
      missing === 8
        ? `Rechtsonder hoort de laatste waarde: ${applied(f[3], steps[3])}.`
        : `Linksboven hoort de eerste waarde: ${applied(f[1], -steps[0])}.`
    }`,
    hint: `De rijen lopen hier niet met een vaste stap, dus lees het raster eens schuin. Ga van rechtsboven naar linksonder: die drie vakjes zijn gelijk aan elkaar. Elk vakje hangt dus alleen af van rij plus kolom. Kijk daarna hoe de reeks ${f[1]}, ${f[2]}, ${f[3]} zelf oploopt.`,
    family: 'gridDiagonal',
    distractors: [
      // Toch een rij als gewone reeks lezen is hier de valkuil.
      missing === 8 ? f[3] + steps[2] : f[1] - steps[1],
      answer + grow,
      answer + 1,
      answer - 1,
    ],
  };
}

const gridFamiliesByLevel: Record<number, (() => NumericGridPuzzle)[]> = {
  3: [() => gridSum('row'), gridRowDiff],
  4: [gridColProduct, () => gridSum('col')],
  5: [gridRowScaled, gridRowMulMinus],
  6: [gridRowCol, gridDiagonal],
};

// Bouwt een cijfermatrix voor een gegeven niveau (3..6). Exporteerbaar voor tests.
export function buildNumericGrid(level: number): NumericGridPuzzle {
  const clamped = Math.min(MAX_LEVEL, Math.max(3, Math.round(level)));
  return pick(gridFamiliesByLevel[clamped])();
}

// --- "Welke hoort niet in de rij" ---
//
// Een rij die bijna helemaal een regel volgt, met precies een bedorven term.
// De eenduidigheid is hier het hele probleem: het mag niet zo zijn dat je ook
// een ander getal kunt vervangen en de rij dan net zo goed klopt. Daarom wordt
// elke kandidaat getoetst voordat hij de deur uit gaat (zie `repairSpots`), en
// niet alleen in de tests.

export type NumericOddFamily =
  | 'oddArithmetic'
  | 'oddGeometric'
  | 'oddQuadratic'
  | 'oddInterwoven'
  | 'oddRecursive'
  | 'oddGeoDiff'
  | 'oddFibonacci'
  | 'oddAltOps';

export interface NumericOddOne {
  row: number[]; // de rij zoals hij getoond wordt, inclusief de vreemde eend
  index: number; // plek van de vreemde eend
  answer: number; // het getoonde, bedorven getal
  cleanValue: number; // wat er volgens de regel had moeten staan
  explanation: string;
  hint: string;
  family: NumericOddFamily;
  distractors: number[];
}

// Vult een rij van lengte n vanuit een venster met bekende waarden. Zodra een
// stap geen heel getal oplevert, is de regel hier niet van toepassing.
function grow(
  n: number,
  start: number,
  known: number[],
  next: (out: number[], k: number) => number | null,
  prev: (out: number[], k: number) => number | null,
): number[] | null {
  const out = new Array<number>(n);
  known.forEach((value, i) => (out[start + i] = value));
  for (let k = start + known.length; k < n; k++) {
    const value = next(out, k);
    if (value === null || !Number.isInteger(value)) return null;
    out[k] = value;
  }
  for (let k = start - 1; k >= 0; k--) {
    const value = prev(out, k);
    if (value === null || !Number.isInteger(value)) return null;
    out[k] = value;
  }
  return out;
}

// Alle opeenvolgende vensters van `size` posities.
function windows(n: number, size: number): number[][] {
  const out: number[][] = [];
  for (let s = 0; s + size <= n; s++) out.push(Array.from({ length: size }, (_, i) => s + i));
  return out;
}

interface OddRule {
  family: NumericOddFamily;
  // Exacte controle of een hele rij de regel volgt.
  isClean: (row: number[]) => boolean;
  // Indexsets waaruit de regel volledig af te leiden is.
  anchorSets: (n: number) => number[][];
  // Reconstrueert de hele rij uit die ankers, of null als dat niet kan.
  fromAnchors: (row: number[], anchors: number[]) => number[] | null;
  // Bouwt een schone rij plus de omschrijving van de regel.
  build: () => { row: number[]; ruleText: string };
}

const oddArithmetic: OddRule = {
  family: 'oddArithmetic',
  isClean: (row) => {
    const d = row[1] - row[0];
    return d !== 0 && differences(row).every((x) => x === d);
  },
  anchorSets: (n) => windows(n, 2),
  fromAnchors: (row, [i]) => {
    const d = row[i + 1] - row[i];
    if (d === 0) return null;
    return grow(
      row.length,
      i,
      [row[i], row[i + 1]],
      (o, k) => o[k - 1] + d,
      (o, k) => o[k + 1] - d,
    );
  },
  build: () => {
    const step = randInt(3, 12) * pick([1, -1]);
    const start = step > 0 ? randInt(3, 30) : randInt(45, 95);
    return {
      row: Array.from({ length: 6 }, (_, i) => start + i * step),
      ruleText: `De rij hoort met een vaste stap van ${stepLabel(step)} te lopen.`,
    };
  },
};

const oddGeometric: OddRule = {
  family: 'oddGeometric',
  isClean: (row) => {
    if (row[0] === 0 || row[1] % row[0] !== 0) return false;
    const r = row[1] / row[0];
    if (Math.abs(r) < 2) return false;
    return row.every((v, i) => i === 0 || v === row[i - 1] * r);
  },
  anchorSets: (n) => windows(n, 2),
  fromAnchors: (row, [i]) => {
    if (row[i] === 0 || row[i + 1] % row[i] !== 0) return null;
    const r = row[i + 1] / row[i];
    if (Math.abs(r) < 2) return null;
    return grow(
      row.length,
      i,
      [row[i], row[i + 1]],
      (o, k) => o[k - 1] * r,
      (o, k) => o[k + 1] / r,
    );
  },
  build: () => {
    const r = pick([2, 3]);
    const start = randInt(2, 6);
    return {
      row: Array.from({ length: 6 }, (_, i) => start * r ** i),
      ruleText: `Elk getal hoort de vorige keer ${r} te zijn.`,
    };
  },
};

const oddQuadratic: OddRule = {
  family: 'oddQuadratic',
  isClean: (row) => {
    const d2 = differences(differences(row));
    return d2[0] !== 0 && d2.every((x) => x === d2[0]);
  },
  anchorSets: (n) => windows(n, 3),
  fromAnchors: (row, [i]) => {
    const d1 = row[i + 1] - row[i];
    const e = row[i + 2] - row[i + 1] - d1;
    if (e === 0) return null;
    return grow(
      row.length,
      i,
      [row[i], row[i + 1], row[i + 2]],
      (o, k) => o[k - 1] + d1 + (k - 1 - i) * e,
      (o, k) => o[k + 1] - (d1 + (k - i) * e),
    );
  },
  build: () => {
    const e = randInt(2, 5);
    const d1 = randInt(2, 8);
    const start = randInt(2, 15);
    const row = [start];
    for (let i = 0; i < 5; i++) row.push(row[i] + d1 + i * e);
    return {
      row,
      ruleText: `De stappen in de rij horen telkens ${stepLabel(e)} groter te worden: ${diffList(row)}.`,
    };
  },
};

const oddInterwoven: OddRule = {
  family: 'oddInterwoven',
  isClean: (row) => {
    const steps: number[] = [];
    for (const parity of [0, 1]) {
      const strand = row.filter((_, i) => i % 2 === parity);
      // Minstens vier termen per reeks. Bij drie is elke rij met een vaste stap
      // ook als twee verweven reeksen te lezen, en dan zou een rij met een
      // vaste stap nooit een eenduidige vreemde eend kunnen hebben.
      if (strand.length < 4) return false;
      const d = strand[1] - strand[0];
      if (d === 0 || !differences(strand).every((x) => x === d)) return false;
      steps.push(d);
    }
    return steps[0] !== steps[1];
  },
  // Twee ankers per reeks: hoe de bedorven term ook valt, er blijft altijd een
  // combinatie over die hem mijdt.
  anchorSets: (n) => {
    const byParity = [0, 1].map((p) =>
      Array.from({ length: n }, (_, i) => i).filter((i) => i % 2 === p),
    );
    const pairs = (list: number[]): number[][] => {
      const out: number[][] = [];
      for (let a = 0; a < list.length; a++)
        for (let b = a + 1; b < list.length; b++) out.push([list[a], list[b]]);
      return out;
    };
    const sets: number[][] = [];
    for (const even of pairs(byParity[0])) for (const odd of pairs(byParity[1])) sets.push([...even, ...odd]);
    return sets;
  },
  fromAnchors: (row, anchors) => {
    const even = anchors.filter((i) => i % 2 === 0);
    const odd = anchors.filter((i) => i % 2 === 1);
    if (even.length !== 2 || odd.length !== 2) return null;
    const stepOf = (pairIdx: number[]): number | null => {
      const gap = (pairIdx[1] - pairIdx[0]) / 2;
      const d = (row[pairIdx[1]] - row[pairIdx[0]]) / gap;
      return Number.isInteger(d) && d !== 0 ? d : null;
    };
    const dEven = stepOf(even);
    const dOdd = stepOf(odd);
    if (dEven === null || dOdd === null || dEven === dOdd) return null;
    return Array.from({ length: row.length }, (_, k) =>
      k % 2 === 0
        ? row[even[0]] + ((k - even[0]) / 2) * dEven
        : row[odd[0]] + ((k - odd[0]) / 2) * dOdd,
    );
  },
  build: () => {
    const stepA = randInt(3, 9);
    const stepB = -randInt(3, 9);
    const startA = randInt(2, 15);
    const startB = randInt(45, 85);
    const row = Array.from({ length: 8 }, (_, k) =>
      k % 2 === 0 ? startA + (k / 2) * stepA : startB + ((k - 1) / 2) * stepB,
    );
    return {
      row,
      ruleText: `Er staan twee reeksen door elkaar: de oneven posities horen ${stepLabel(stepA)} te lopen en de even posities ${stepLabel(stepB)}.`,
    };
  },
};

const oddRecursive: OddRule = {
  family: 'oddRecursive',
  isClean: (row) => {
    if (row[1] === row[0]) return false;
    const m = (row[2] - row[1]) / (row[1] - row[0]);
    if (!Number.isInteger(m) || m < 2 || m > 6) return false;
    const c = row[1] - m * row[0];
    if (c === 0) return false;
    return row.every((v, i) => i === 0 || v === row[i - 1] * m + c);
  },
  anchorSets: (n) => windows(n, 3),
  fromAnchors: (row, [i]) => {
    if (row[i + 1] === row[i]) return null;
    const m = (row[i + 2] - row[i + 1]) / (row[i + 1] - row[i]);
    if (!Number.isInteger(m) || m < 2 || m > 6) return null;
    const c = row[i + 1] - m * row[i];
    if (c === 0) return null;
    return grow(
      row.length,
      i,
      [row[i], row[i + 1], row[i + 2]],
      (o, k) => o[k - 1] * m + c,
      (o, k) => (o[k + 1] - c) / m,
    );
  },
  build: () => {
    const m = pick([2, 3]);
    const c = pick([-5, -3, -2, 2, 3, 5]);
    const start = randIntExcept(2, 7, -c / (m - 1));
    const row = [start];
    for (let i = 0; i < 5; i++) row.push(row[i] * m + c);
    return {
      row,
      ruleText: `Elk getal hoort de vorige keer ${m} ${c < 0 ? `min ${-c}` : `plus ${c}`} te zijn.`,
    };
  },
};

const oddGeoDiff: OddRule = {
  family: 'oddGeoDiff',
  isClean: (row) => {
    const d = differences(row);
    if (d[0] === 0 || d[1] % d[0] !== 0) return false;
    const r = d[1] / d[0];
    if (r < 2 || r > 5) return false;
    return d.every((v, i) => i === 0 || v === d[i - 1] * r);
  },
  anchorSets: (n) => windows(n, 3),
  fromAnchors: (row, [i]) => {
    const d0 = row[i + 1] - row[i];
    if (d0 === 0) return null;
    const d1 = row[i + 2] - row[i + 1];
    if (d1 % d0 !== 0) return null;
    const r = d1 / d0;
    if (r < 2 || r > 5) return null;
    return grow(
      row.length,
      i,
      [row[i], row[i + 1], row[i + 2]],
      (o, k) => o[k - 1] + d0 * r ** (k - 1 - i),
      (o, k) => {
        const step = d0 / r ** (i - k);
        return Number.isInteger(step) ? o[k + 1] - step : null;
      },
    );
  },
  build: () => {
    const r = pick([2, 3]);
    const d = randInt(2, 6);
    const row = [randInt(3, 20)];
    for (let i = 0; i < 5; i++) row.push(row[i] + d * r ** i);
    return {
      row,
      ruleText: `De verschillen horen elke stap ${r} keer zo groot te worden: ${diffList(row)}.`,
    };
  },
};

const oddFibonacci: OddRule = {
  family: 'oddFibonacci',
  isClean: (row) => row.every((v, i) => i < 2 || v === row[i - 1] + row[i - 2]),
  anchorSets: (n) => windows(n, 2),
  fromAnchors: (row, [i]) =>
    grow(
      row.length,
      i,
      [row[i], row[i + 1]],
      (o, k) => o[k - 1] + o[k - 2],
      (o, k) => o[k + 2] - o[k + 1],
    ),
  build: () => {
    const a = randInt(2, 9);
    const b = randInt(a + 1, a + 12);
    const row = [a, b];
    for (let i = 2; i < 7; i++) row.push(row[i - 1] + row[i - 2]);
    return { row, ruleText: 'Elk getal hoort de som te zijn van de twee getallen ervoor.' };
  },
};

const oddAltOps: OddRule = {
  family: 'oddAltOps',
  isClean: (row) => {
    if (row[0] === 0 || row[1] % row[0] !== 0) return false;
    const m = row[1] / row[0];
    const a = row[2] - row[1];
    if (m < 2 || m > 5 || a === 0) return false;
    return row.every((v, i) => i === 0 || v === (i % 2 === 1 ? row[i - 1] * m : row[i - 1] + a));
  },
  anchorSets: (n) => windows(n, 3),
  fromAnchors: (row, [i]) => {
    let m: number;
    let a: number;
    if (i % 2 === 0) {
      if (row[i] === 0 || row[i + 1] % row[i] !== 0) return null;
      m = row[i + 1] / row[i];
      a = row[i + 2] - row[i + 1];
    } else {
      a = row[i + 1] - row[i];
      if (row[i + 1] === 0 || row[i + 2] % row[i + 1] !== 0) return null;
      m = row[i + 2] / row[i + 1];
    }
    if (m < 2 || m > 5 || a === 0) return null;
    return grow(
      row.length,
      i,
      [row[i], row[i + 1], row[i + 2]],
      (o, k) => ((k - 1) % 2 === 0 ? o[k - 1] * m : o[k - 1] + a),
      (o, k) => (k % 2 === 0 ? o[k + 1] / m : o[k + 1] - a),
    );
  },
  build: () => {
    const m = pick([2, 3]);
    const a = randInt(2, 7);
    const row = [randInt(3, 8)];
    for (let i = 0; i < 6; i++) row.push(i % 2 === 0 ? row[i] * m : row[i] + a);
    return {
      row,
      ruleText: `De bewerkingen horen elkaar af te wisselen: x${m}, ${stepLabel(a)}, x${m}, ${stepLabel(a)}, ...`,
    };
  },
};

const ODD_RULES: OddRule[] = [
  oddArithmetic,
  oddGeometric,
  oddQuadratic,
  oddInterwoven,
  oddRecursive,
  oddGeoDiff,
  oddFibonacci,
  oddAltOps,
];

// Alle plekken waarvan het vervangen van dat ene getal de rij weer kloppend
// maakt, volgens welke van de bekende regels dan ook. De sentinel -1 betekent
// dat de rij al klopt: dan is er helemaal geen vreemde eend.
function repairSpots(row: number[]): Set<number> {
  const spots = new Set<number>();
  for (const rule of ODD_RULES) {
    for (const anchors of rule.anchorSets(row.length)) {
      const candidate = rule.fromAnchors(row, anchors);
      if (!candidate || !rule.isClean(candidate)) continue;
      const differing: number[] = [];
      for (let k = 0; k < row.length; k++) if (candidate[k] !== row[k]) differing.push(k);
      if (differing.length === 0) spots.add(-1);
      if (differing.length === 1) spots.add(differing[0]);
    }
  }
  return spots;
}

const ODD_DELTAS = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];

const oddRulesByLevel: Record<number, OddRule[]> = {
  3: [oddArithmetic, oddGeometric],
  4: [oddQuadratic, oddInterwoven],
  5: [oddRecursive, oddGeoDiff],
  6: [oddFibonacci, oddAltOps],
};

// Drie andere getoonde termen als afleiders, met onderling verschillende
// waarden. Null als de rij daar te weinig verschillende getallen voor heeft.
function otherTerms(row: number[], index: number): number[] | null {
  const values: number[] = [];
  for (const i of shuffle(row.map((_, i) => i))) {
    if (i === index) continue;
    if (row[i] === row[index] || values.includes(row[i])) continue;
    values.push(row[i]);
    if (values.length === 3) return values;
  }
  return null;
}

function makeOddOne(
  rule: OddRule,
  clean: number[],
  ruleText: string,
  index: number,
  row: number[],
  distractors: number[],
): NumericOddOne {
  return {
    row,
    index,
    answer: row[index],
    cleanValue: clean[index],
    explanation: `${ruleText} Reken je de rij door, dan hoort op de ${ORDINALS[index]} plek ${clean[index]} te staan, maar er staat ${row[index]}. Dat getal breekt de regel.`,
    hint: `Zoek de regel bij het begin van de rij: kijk hoe je van ${row[0]} naar ${row[1]} komt. Reken de rij daarna zelf verder uit volgens die regel en leg jouw uitkomsten naast de getallen die er staan. Het eerste getal dat afwijkt hoeft niet zelf de boosdoener te zijn: controleer of de rest weer klopt zodra je juist dat getal vervangt.`,
    family: rule.family,
    distractors,
  };
}

// Bouwt een "welke hoort niet in de rij" voor een gegeven niveau (3..6).
// Exporteerbaar voor tests.
export function buildNumericOddOne(level: number): NumericOddOne {
  const clamped = Math.min(MAX_LEVEL, Math.max(3, Math.round(level)));
  const attempt = (rules: OddRule[]): NumericOddOne | null => {
    const rule = pick(rules);
    const { row: clean, ruleText } = rule.build();
    // Nooit de eerste twee termen (daar zoekt de gebruiker de regel) en nooit
    // de laatste (dan is het gewoon een reeksvraag).
    const index = randInt(2, clean.length - 2);
    const row = [...clean];
    row[index] += pick(ODD_DELTAS);
    const spots = repairSpots(row);
    if (spots.size !== 1 || !spots.has(index)) return null;
    const distractors = otherTerms(row, index);
    if (!distractors) return null;
    return makeOddOne(rule, clean, ruleText, index, row, distractors);
  };
  for (let i = 0; i < 80; i++) {
    const found = attempt(oddRulesByLevel[clamped]);
    if (found) return found;
  }
  // Terugval: een rij met een vaste stap is vrijwel altijd eenduidig te
  // bederven. Lukt zelfs dat niet, dan geldt het vaste rijtje hieronder.
  for (let i = 0; i < 200; i++) {
    const found = attempt([oddArithmetic]);
    if (found) return found;
  }
  const clean = [4, 11, 18, 25, 32, 39];
  const row = [...clean];
  row[3] = 27;
  return makeOddOne(oddArithmetic, clean, 'De rij hoort met een vaste stap van +7 te lopen.', 3, row, [
    11, 18, 32,
  ]);
}

let counter = 0;

// Vormverdeling. Vanaf niveau 3 komen naast de reeksen ook cijfermatrices en
// "welke hoort niet in de rij" voorbij, net als in de echte politietest. Een op
// de tien vragen is een matrix en een op de tien een vreemde eend, samen dus
// ongeveer een op de vijf; de reeks blijft daarmee ruim de kernvorm. De keuze
// staat hier en niet in `strategiesByLevel`, omdat de andere vormen geen
// NumericSeries opleveren en een eigen opbouw hebben.
function pickForm(level: number): ItemForm {
  if (level < 3) return 'numericSeries';
  const roll = randInt(1, 10);
  if (roll === 1) return 'numericGrid';
  if (roll === 2) return 'numericOddOne';
  return 'numericSeries';
}

function nextId(level: number): string {
  counter += 1;
  return `numeric-${level}-${counter}`;
}

function seriesItem(level: number): Item {
  const series = buildNumericSeries(level);
  const fallback = [
    series.answer + 1,
    series.answer - 1,
    series.answer + 2,
    series.terms[series.terms.length - 1],
    series.answer - 2,
  ];
  const distractors = [...(series.distractors ?? []), ...fallback];
  const { options, correctIndex } = buildOptions(String(series.answer), distractors.map(String));
  return {
    id: nextId(level),
    category: 'numeric',
    form: 'numericSeries',
    level,
    prompt: `Welk getal komt er op de plek van het vraagteken?\n\n${series.terms.join(', ')}, ?`,
    options,
    correctIndex,
    explanation: series.explanation,
    hint: { strategy: STRATEGY_HINTS.numericSeries, step: series.hint },
  };
}

function gridItem(level: number): Item {
  const puzzle = buildNumericGrid(level);
  const fallback = [puzzle.answer + 1, puzzle.answer - 1, puzzle.answer + 2, puzzle.answer - 2];
  const { options, correctIndex } = buildOptions(
    String(puzzle.answer),
    [...puzzle.distractors, ...fallback].map(String),
  );
  return {
    id: nextId(level),
    category: 'numeric',
    form: 'numericGrid',
    level,
    // Het raster wordt apart getoond, dus de vraagtekst noemt geen getallen.
    prompt: 'Welk getal hoort in het lege vakje?',
    grid: {
      cols: puzzle.cols,
      cells: puzzle.values.map((value, i) => (i === puzzle.missing ? '?' : String(value))),
    },
    options,
    correctIndex,
    explanation: puzzle.explanation,
    hint: { strategy: STRATEGY_HINTS.numericGrid, step: puzzle.hint },
  };
}

function oddOneItem(level: number): Item {
  const puzzle = buildNumericOddOne(level);
  const { options, correctIndex } = buildOptions(
    String(puzzle.answer),
    puzzle.distractors.map(String),
  );
  return {
    id: nextId(level),
    category: 'numeric',
    form: 'numericOddOne',
    level,
    prompt: `Welk getal hoort niet in de rij?\n\n${puzzle.row.join(', ')}`,
    options,
    correctIndex,
    explanation: puzzle.explanation,
    hint: { strategy: STRATEGY_HINTS.numericOddOne, step: puzzle.hint },
  };
}

export function generateNumeric(level: number): Item {
  const clamped = clampLevel(level);
  const form = pickForm(clamped);
  if (form === 'numericGrid') return gridItem(clamped);
  if (form === 'numericOddOne') return oddOneItem(clamped);
  return seriesItem(clamped);
}

// Letterpatronen: procedureel gegenereerde opgaven op niveau 1..6.
// Letters worden gerekend als posities A=0..Z=25 met modulo-26 wrap.
//
// Er zijn twee vraagvormen. De reeks ('letterSeries') vraagt om de volgende
// letter; "welke hoort niet in de rij" ('letterOddOne') toont een rij die op
// precies een plaats de regel breekt. Beide vormen komen zo in de echte
// politietest voor.
//
// Net als bij de cijferpatronen zijn er per niveau meerdere families, zodat
// dezelfde puzzelvorm niet steeds terugkomt. De reeks wordt waar mogelijk zo
// in het alfabet gelegd dat er geen omslag van Z naar A nodig is; lukt dat
// niet (bij grote stappen), dan wijst de uitleg de gebruiker daarop.
//
// De zwaarte van een item wordt gestuurd met de knoppen die uit onderzoek naar
// inductief redeneren komen (Holzman 1983; Arendasy & Sommer 2012): het aantal
// regels, het aantal verweven periodes, het aantal bewerkingen per stap en de
// complexiteit van de regel zelf. Op niveau 5 en 6 draaien we vooral aan het
// aantal regels (drie stappen die zich herhalen, drie verweven reeksen) en aan
// regels die niet met een vaste sprong te vangen zijn.

import { MAX_LEVEL, MIN_LEVEL, type Item } from '../engine/types';
import { randInt, pick, shuffle, buildOptions } from './random';
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

function mod26(value: number): number {
  return ((value % 26) + 26) % 26;
}

// Rangtelwoorden voor de uitleg; langer dan de langste rij die we tonen.
const ORDINALS = ['1e', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e', '11e', '12e'];

export type LetterFamily =
  | 'step' // constante stap vooruit of achteruit
  | 'changingStep' // stap die groter of kleiner wordt
  | 'alternating' // twee stappen vooruit die elkaar afwisselen
  | 'zigzag' // afwisselend vooruit en achteruit
  | 'cycleThree' // drie stappen die zich steeds herhalen
  | 'positionStep' // de n-de sprong is n keer een vaste waarde
  | 'interwoven' // twee verweven reeksen
  | 'interwovenTriple' // drie verweven reeksen
  | 'mirror' // een reeks vanaf het begin en een vanaf het eind van het alfabet
  | 'pairs' // letterparen die met een vaste stap opschuiven
  | 'pairsMirror' // letterparen waarvan de letters uit elkaar lopen
  | 'pairsChanging' // letterparen waarvan de eerste letter versnelt
  | 'doublingStep' // stap verdubbelt elke keer
  | 'primePositions' // plaatsen in het alfabet zijn opeenvolgende priemgetallen
  | 'reverseAlphabet' // de plaatsen worden vanaf Z geteld
  | 'fibStep' // stap is de som van de twee vorige stappen
  | 'oddOne'; // welke hoort niet in de rij (eigen bouwer, zie buildLetterOddOne)

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

// Zet een rij stappen om naar posities, beginnend bij 0.
function cumulative(steps: number[]): number[] {
  const offsets = [0];
  for (const step of steps) offsets.push(offsets[offsets.length - 1] + step);
  return offsets;
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

// Drie stappen die zich steeds herhalen, bijvoorbeeld +2, +5, -1, +2, +5, -1.
// Zwaarder dan twee afwisselende stappen: de gebruiker moet drie regels
// vasthouden en bovendien uittellen welke er nu aan de beurt is. Er worden
// zeven letters getoond (twee volledige rondes), zodat de periode van drie
// eenduidig af te lezen is.
function threeStepCycle(first: number, second: number, third: number): OffsetPattern {
  const cycle = [first, second, third];
  const offsets = cumulative([0, 1, 2, 3, 4, 5].map((i) => cycle[i % 3]));
  const labels = cycle.map(stepLabel).join(', ');
  return {
    family: 'cycleThree',
    offsets,
    answerOffset: offsets[6] + first,
    describe: (tokens, answer) =>
      `Er herhalen zich drie stappen: ${labels}, ${labels}, ... Na twee volledige rondes is ${stepLabel(first)} weer aan de beurt, dus na ${tokens[6]} volgt ${answer}.`,
    hint: (tokens) =>
      `Zet de letters om naar hun plaats in het alfabet: ${positionList(tokens)}. Twee sprongen die elkaar afwisselen verklaren deze rij niet: schrijf alle zes de sprongen op en kijk vanaf welke sprong het rijtje zichzelf herhaalt.`,
  };
}

// De n-de sprong is n keer een vaste waarde en wisselt telkens van richting:
// +u, -2u, +3u, -4u, ... De sprong hangt dus af van de plaats in de reeks en
// niet van de vorige sprong.
function positionStep(unit: number): OffsetPattern {
  const steps = [1, 2, 3, 4, 5].map((n) => (n % 2 === 1 ? 1 : -1) * n * unit);
  const offsets = cumulative(steps.slice(0, 4));
  return {
    family: 'positionStep',
    offsets,
    answerOffset: offsets[4] + steps[4],
    describe: (tokens, answer) =>
      `De sprongen worden steeds een stap groter en wisselen van richting: ${steps
        .slice(0, 4)
        .map(stepLabel)
        .join(', ')}, ... De vijfde sprong is ${stepLabel(steps[4])}, dus na ${tokens[4]} volgt ${answer}.`,
    hint: (tokens) =>
      `Zet de letters om naar hun plaats in het alfabet: ${positionList(tokens)}. De reeks gaat om en om vooruit en achteruit, maar niet even ver. Let op hoe groot elke sprong is en vergelijk dat met de plaats van die sprong in de rij.`,
  };
}

// Twee verweven reeksen. Wisselend wordt naar de reeks op de oneven plaatsen
// gevraagd of naar die op de even plaatsen: hoorde het vraagteken altijd bij de
// eerste reeks, dan was de opgave veel makkelijker zodra de gebruiker dat
// doorhad. Welke reeks gevraagd wordt volgt uit de lengte van de getoonde rij,
// en de gevraagde reeks toont altijd drie letters.
function interwovenPair(
  stepA: number,
  gap: number,
  stepB: number,
  ask: 'A' | 'B',
): OffsetPattern {
  const posA = (i: number): number => i * stepA;
  const posB = (i: number): number => gap + i * stepB;
  const shown = [posA(0), posB(0), posA(1), posB(1), posA(2), posB(2)];
  if (ask === 'B') shown.push(posA(3));
  const askIdx = ask === 'A' ? [0, 2, 4] : [1, 3, 5];
  const otherIdx = ask === 'A' ? [1, 3, 5] : [0, 2, 4];
  const askStep = ask === 'A' ? stepA : stepB;
  const otherStep = ask === 'A' ? stepB : stepA;
  const askLabel = ask === 'A' ? 'oneven' : 'even';
  const otherLabel = ask === 'A' ? 'even' : 'oneven';
  return {
    family: 'interwoven',
    offsets: shown,
    answerOffset: ask === 'A' ? posA(3) : posB(3),
    describe: (tokens, answer) =>
      `Twee verweven reeksen. De ${askLabel} plaatsen lopen ${stepLabel(askStep)} (${askIdx
        .map((i) => tokens[i])
        .join(', ')}, ...), de ${otherLabel} plaatsen lopen ${stepLabel(otherStep)} (${otherIdx
        .map((i) => tokens[i])
        .join(', ')}, ...). Het vraagteken staat op de ${ORDINALS[shown.length]} plaats en hoort dus bij de reeks van de ${askLabel} plaatsen: na ${tokens[askIdx[2]]} volgt ${answer}.`,
    hint: (tokens) =>
      `De letters springen heen en weer, want er staan twee reeksen door elkaar: ${[0, 2, 4]
        .map((i) => tokens[i])
        .join(', ')} en ${[1, 3, 5].map((i) => tokens[i]).join(', ')}. Tel na op welke plaats het vraagteken staat, want dat bepaalt bij welke van die twee reeksen het hoort.`,
  };
}

interface TripleOptions {
  stepMin: number; // ondergrens voor de stap van de gevraagde reeks
  stepMax: number;
  backwards: boolean; // laat een van de andere reeksen teruglopen
  ask: 0 | 1 | 2; // welke van de drie reeksen wordt gevraagd
}

// Drie verweven reeksen: elke derde letter hoort bij dezelfde reeks. Ook hier
// wisselt de gevraagde reeks; de rij wordt daarvoor een of twee letters langer
// getoond, zodat de gevraagde reeks altijd drie letters laat zien.
function interwovenTriple({ stepMin, stepMax, backwards, ask }: TripleOptions): OffsetPattern {
  const steps = [randInt(1, 3), randInt(1, 3), randInt(1, 3)];
  steps[ask] = randInt(stepMin, stepMax);
  // Een van de niet-gevraagde reeksen loopt terug; dat maakt de opgave zwaarder
  // zonder de gevraagde reeks zelf onleesbaar te maken.
  if (backwards) steps[(ask + 1) % 3] = -randInt(2, 4);
  const starts = [randInt(0, 1), randInt(5, 7), randInt(10, 12)];
  const at = (slot: number): number => starts[slot % 3] + Math.floor(slot / 3) * steps[slot % 3];
  const shownLength = 9 + ask;
  const offsets = Array.from({ length: shownLength }, (_, slot) => at(slot));
  const askIdx = [ask, ask + 3, ask + 6];
  return {
    family: 'interwovenTriple',
    offsets,
    answerOffset: at(9 + ask),
    describe: (tokens, answer) =>
      `Drie verweven reeksen: elke derde letter hoort bij dezelfde reeks. Het vraagteken staat op de ${ORDINALS[shownLength]} plaats en hoort bij de reeks ${askIdx
        .map((i) => tokens[i])
        .join(', ')}, die ${stepLabel(steps[ask])} loopt. Na ${tokens[askIdx[2]]} volgt ${answer}.`,
    hint: (tokens) =>
      `Twee reeksen door elkaar levert hier niets op, probeer er drie: elke derde letter hoort bij dezelfde reeks. Kijk naar de ${askIdx
        .map((i) => ORDINALS[i])
        .join(', ')} letter (${askIdx
        .map((i) => tokens[i])
        .join(', ')}) en tel na dat het vraagteken bij precies die reeks hoort.`,
  };
}

// Een reeks die vooraan in het alfabet begint, verweven met een reeks die
// achteraan begint en terugloopt. Ook hier wisselt de gevraagde reeks.
function mirrorPair(forwardMin: number, forwardMax: number, ask: 'A' | 'B'): LetterSeries {
  const stepForward = randInt(forwardMin, forwardMax);
  const stepBack = randInt(1, 3);
  const startForward = randInt(0, 2);
  const startBack = randInt(23, 25);
  const forwardAt = (i: number): number => startForward + i * stepForward;
  const backAt = (i: number): number => startBack - i * stepBack;
  const positions = [
    forwardAt(0),
    backAt(0),
    forwardAt(1),
    backAt(1),
    forwardAt(2),
    backAt(2),
  ];
  if (ask === 'B') positions.push(forwardAt(3));
  const askIdx = ask === 'A' ? [0, 2, 4] : [1, 3, 5];
  const askLabel = ask === 'A' ? 'oneven' : 'even';
  return letterSeries({
    family: 'mirror',
    positions,
    answerIndex: ask === 'A' ? forwardAt(3) : backAt(3),
    describe: (tokens, answer) =>
      `De oneven plaatsen beginnen vooraan in het alfabet en lopen ${stepLabel(stepForward)} (${[0, 2, 4]
        .map((i) => tokens[i])
        .join(', ')}, ...), de even plaatsen beginnen achteraan en lopen ${stepLabel(-stepBack)} (${[1, 3, 5]
        .map((i) => tokens[i])
        .join(', ')}, ...). Het vraagteken staat op de ${ORDINALS[positions.length]} plaats, dus op een ${askLabel} plaats: na ${tokens[askIdx[2]]} volgt ${answer}.`,
    hint: (tokens) =>
      `Hier staan twee reeksen door elkaar die elkaar vanaf beide uiteinden van het alfabet tegemoet komen: ${[0, 2, 4]
        .map((i) => tokens[i])
        .join(', ')} loopt vooruit en ${[1, 3, 5]
        .map((i) => tokens[i])
        .join(', ')} loopt terug. Tel na op welke plaats het vraagteken staat, want dat bepaalt welke van de twee je moet volgen.`,
  });
}

// Stap die elke keer verdubbelt: +1, +2, +4, +8, ... De reeks loopt daardoor
// altijd voorbij Z; de uitleg wijst daarop.
function doublingStep(): OffsetPattern {
  const steps = [1, 2, 4, 8, 16];
  const offsets = [0];
  for (let i = 0; i < 4; i++) offsets.push(offsets[i] + steps[i]);
  return {
    family: 'doublingStep',
    offsets,
    answerOffset: offsets[4] + steps[4],
    describe: (tokens, answer) =>
      `Elke sprong is twee keer zo groot als de vorige: ${steps
        .slice(0, 4)
        .map(stepLabel)
        .join(', ')}, ... De volgende sprong is ${stepLabel(steps[4])}, dus na ${tokens[4]} volgt ${answer}.`,
    hint: (tokens) =>
      `Zet de letters om naar hun plaats in het alfabet: ${positionList(tokens)}. De sprongen zijn dan ${steps
        .slice(0, 4)
        .map(stepLabel)
        .join(', ')}. Die sprongen lopen niet met een vast bedrag op; deel ze eens door elkaar.`,
  };
}

// Priemgetallen tot en met 26: verder komt de reeks niet zonder omslag.
const PRIME_POSITIONS = [2, 3, 5, 7, 11, 13, 17, 19, 23];

// De plaatsen in het alfabet zijn opeenvolgende priemgetallen: B, C, E, G, K, ...
// De sprongen zijn hier onregelmatig, dus rekenen levert niets op.
function primePositions(): LetterSeries {
  const start = randInt(0, PRIME_POSITIONS.length - 6);
  const values = PRIME_POSITIONS.slice(start, start + 6);
  return letterSeries({
    family: 'primePositions',
    positions: values.slice(0, 5).map((v) => v - 1),
    answerIndex: values[5] - 1,
    describe: (tokens, answer) =>
      `De plaatsen in het alfabet zijn opeenvolgende priemgetallen: ${positionList(tokens)}. Het priemgetal na ${values[4]} is ${values[5]}, en dat is de letter ${answer}.`,
    hint: (tokens) =>
      `Zet de letters om naar hun plaats in het alfabet: ${positionList(tokens)}. De sprongen daartussen zijn onregelmatig, dus er zit geen rekenregel achter. Kijk eens door welke getallen die plaatsen deelbaar zijn: het gaat om een bekend rijtje getallen.`,
  });
}

// Omgekeerd alfabet: de plaatsen worden niet vanaf A geteld maar vanaf Z
// (Z=1, Y=2, ... A=26), en in die telling zijn het opeenvolgende priemgetallen.
// Vanaf A geteld levert dat geen net patroon op, dus de gebruiker moet echt op
// het idee komen om andersom te tellen. Zonder heldere uitleg achteraf is dit
// een gemene opgave, daarom noemt de uitleg de telling met een voorbeeld.
function reverseAlphabetPrimes(): LetterSeries {
  const start = randInt(0, PRIME_POSITIONS.length - 6);
  const values = PRIME_POSITIONS.slice(start, start + 6);
  // Plaats 1 vanaf Z is Z zelf (index 25), plaats 26 is A (index 0).
  const toIndex = (fromZ: number): number => 26 - fromZ;
  const shownFromZ = values.slice(0, 5);
  return letterSeries({
    family: 'reverseAlphabet',
    positions: shownFromZ.map(toIndex),
    answerIndex: toIndex(values[5]),
    describe: (tokens, answer) =>
      `Tel de plaatsen niet vanaf A maar vanaf Z: Z=1, Y=2, X=3, ... A=26. In die telling staan hier ${tokens
        .map((t, i) => `${t}=${shownFromZ[i]}`)
        .join(', ')}, en dat zijn opeenvolgende priemgetallen. Het priemgetal na ${values[4]} is ${values[5]}, en de ${values[5]}e letter vanaf Z is ${answer}.`,
    hint: (tokens) =>
      `Vanaf A geteld leveren de plaatsen (${positionList(tokens)}) geen net patroon op. Probeer eens vanaf de andere kant te tellen: Z is dan de eerste letter, Y de tweede, en zo verder. Die getallen vormen wel een bekend rijtje.`,
  });
}

interface PairOptions {
  first: number; // positie van de eerste letter van het eerste paar
  firstStep: number;
  second: number; // positie van de tweede letter van het eerste paar
  secondStep: number;
  firstIncrement?: number; // verandering van de stap van de eerste letter
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
  firstIncrement = 0,
  family,
  describe,
  hint,
}: PairOptions): LetterSeries {
  // De stap van de eerste letter verandert elke keer met firstIncrement; bij 0
  // levert dat gewoon een vaste stap op.
  const firstAt = (i: number): number =>
    first + i * firstStep + firstIncrement * ((i * (i - 1)) / 2);
  const pairAt = (i: number): string => letterAt(firstAt(i)) + letterAt(second + i * secondStep);
  const tokens = Array.from({ length: 5 }, (_, i) => pairAt(i));
  const answerFirst = firstAt(5);
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

// Paren waarvan de eerste letter steeds een grotere sprong maakt en de tweede
// een vaste stap houdt. Beide letters vragen dus om een andere analyse.
function acceleratingPairs(): LetterSeries {
  const increment = randInt(1, 2);
  const secondStep = randInt(1, 3);
  const steps = [1, 2, 3, 4, 5].map((i) => 1 + (i - 1) * increment);
  return letterPairs({
    // Zo gekozen dat ook de laatste, grootste sprong nog binnen A..Z past.
    first: randInt(0, 20 - 10 * increment),
    firstStep: 1,
    firstIncrement: increment,
    second: randInt(4, 25 - 5 * secondStep),
    secondStep,
    family: 'pairsChanging',
    describe: (tokens, answer) =>
      `De eerste letter van elk paar maakt een steeds grotere sprong (${steps
        .slice(0, 4)
        .map(stepLabel)
        .join(', ')}, ...), de tweede letter loopt telkens ${stepLabel(secondStep)}. Na ${tokens[4]} volgt ${answer}.`,
    hint: (tokens) =>
      `Behandel de twee letters van elk blokje apart. De eerste letters zijn ${tokens
        .map((t) => t[0])
        .join(', ')} en de tweede ${tokens.map((t) => t[1]).join(', ')}. Let op: maar een van die twee reeksen heeft een vaste sprong.`,
  });
}

// Beginstappen die binnen het alfabet passen wanneer ze fibonacci-gewijs
// oplopen (grotere startstappen zouden voorbij Z schieten).
const FIB_STEP_STARTS: readonly (readonly [number, number])[] = [
  [1, 1],
  [1, 2],
  [2, 1],
];

// Grotere beginstappen: de reeks schiet dan wel voorbij Z, wat de opgave
// zwaarder maakt. Alleen voor het hoogste niveau.
const FIB_STEP_STARTS_HARD: readonly (readonly [number, number])[] = [
  [1, 3],
  [2, 3],
  [3, 2],
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

const askSide = (): 'A' | 'B' => pick(['A', 'B'] as const);

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
      return fromOffsets(
        interwovenPair(stepA, randInt(9, 13), randIntExcept(2, 4, stepA), askSide()),
      );
    },
    () => steppingPairs(3, 4, 2),
  ],
  4: [
    () => fromOffsets(changingStep(1, 2)),
    () => {
      const up = randInt(3, 6);
      return fromOffsets(twoStepCycle(up, -randIntExcept(1, 4, up), 'zigzag'));
    },
    () => fromOffsets(interwovenPair(randInt(2, 4), randInt(14, 20), -randInt(2, 4), askSide())),
    () => mirrorPair(1, 3, askSide()),
    divergingPairs,
  ],
  5: [
    () => {
      const [a, b] = pick(FIB_STEP_STARTS);
      return fromOffsets(fibonacciSteps(a, b));
    },
    () =>
      fromOffsets(
        interwovenTriple({ stepMin: 2, stepMax: 3, backwards: false, ask: pick([0, 1, 2] as const) }),
      ),
    () => fromOffsets(twoStepCycle(randInt(2, 4), -randInt(5, 8), 'zigzag')),
    () => fromOffsets(interwovenPair(randInt(4, 6), randInt(14, 20), -randInt(4, 6), askSide())),
    () => fromOffsets(changingStep(randInt(1, 2), 3)), // sterk oplopende stap
    () => mirrorPair(2, 4, askSide()),
    () => fromOffsets(threeStepCycle(randInt(1, 3), randInt(4, 6), -randInt(1, 3))),
    () => fromOffsets(positionStep(randInt(1, 2))),
  ],
  // Niveau 6: reeksen waarbij rekenen met de sprongen niet meer volstaat, of
  // waarbij meer dan twee sporen tegelijk gevolgd moeten worden.
  6: [
    primePositions,
    reverseAlphabetPrimes,
    () => fromOffsets(doublingStep()),
    () =>
      fromOffsets(
        interwovenTriple({ stepMin: 3, stepMax: 5, backwards: true, ask: pick([0, 1, 2] as const) }),
      ),
    () => {
      const [a, b] = pick(FIB_STEP_STARTS_HARD);
      return fromOffsets(fibonacciSteps(a, b));
    },
    acceleratingPairs,
    () => mirrorPair(4, 6, askSide()),
    () => fromOffsets(threeStepCycle(randInt(2, 4), randInt(6, 8), -randInt(3, 5))),
    () => fromOffsets(positionStep(randInt(2, 3))),
  ],
};

// Bouwt de reeks voor een gegeven niveau (1..6). Exporteerbaar voor tests.
export function buildLetterSeries(level: number): LetterSeries {
  return pick(strategiesByLevel[clampLevel(level)])();
}

// --- Welke hoort niet in de rij ---
//
// Een rij van zes tot negen letters volgt een regel, met precies een letter die
// hem breekt. De eenduidigheid is hier het hele probleem: een bedorven letter
// kan per ongeluk als "de stap verandert daar" gelezen worden, of via de omslag
// van Z naar A alsnog kloppen. Daarom wordt elke kandidaat getoetst met
// `findUniqueBrokenIndex`: er moet precies een plaats zijn waarvan het
// vervangen de hele rij weer kloppend maakt, en de rij zoals hij getoond wordt
// mag zelf nog geen regel volgen.

// De regels waartegen een rij getoetst wordt. Bewust ruimer dan de regels
// waarop de rijen gebouwd worden: hoe meer lezingen we meenemen, hoe strenger
// de controle en hoe kleiner de kans dat een gebruiker een tweede lezing vindt.
// Alles rekent modulo 26, zodat een letter die alleen via de omslag klopt ook
// als kloppend telt en de kandidaat dus verworpen wordt.
type PositionRule = (positions: number[]) => boolean;

function forwardSteps(positions: number[]): number[] {
  return positions.slice(1).map((p, i) => mod26(p - positions[i]));
}

function allSame(values: number[]): boolean {
  return values.every((v) => v === values[0]);
}

const ODD_ONE_RULES: PositionRule[] = [
  // Vaste stap.
  (p) => allSame(forwardSteps(p)),
  // Stap die elke keer even veel verandert (bevat ook de vaste stap).
  (p) => {
    const d = forwardSteps(p);
    if (d.length < 3) return false;
    const increment = mod26(d[1] - d[0]);
    return d.every((step, i) => step === mod26(d[0] + i * increment));
  },
  // Twee stappen die elkaar afwisselen.
  (p) => {
    const d = forwardSteps(p);
    if (d.length < 4) return false;
    return d.every((step, i) => step === d[i % 2]);
  },
  // Drie stappen die zich herhalen.
  (p) => {
    const d = forwardSteps(p);
    if (d.length < 5) return false;
    return d.every((step, i) => step === d[i % 3]);
  },
  // Twee verweven reeksen, elk met een vaste stap.
  (p) => {
    const even = p.filter((_, i) => i % 2 === 0);
    const odd = p.filter((_, i) => i % 2 === 1);
    if (even.length < 3 || odd.length < 3) return false;
    return allSame(forwardSteps(even)) && allSame(forwardSteps(odd));
  },
  // Elke stap is de som van de twee vorige stappen.
  (p) => {
    const d = forwardSteps(p);
    if (d.length < 4) return false;
    return d.slice(2).every((step, i) => step === mod26(d[i] + d[i + 1]));
  },
  // Elke stap is twee keer de vorige.
  (p) => {
    const d = forwardSteps(p);
    if (d.length < 3) return false;
    return d.slice(1).every((step, i) => step === mod26(2 * d[i]));
  },
];

function followsAnyRule(positions: number[]): boolean {
  return ODD_ONE_RULES.some((rule) => rule(positions));
}

// Geeft de enige plaats terug waarvan het vervangen de rij kloppend maakt, of
// null wanneer dat er geen of meer dan een zijn (dan is de opgave niet
// eenduidig en wordt de kandidaat verworpen).
function findUniqueBrokenIndex(positions: number[]): number | null {
  if (followsAnyRule(positions)) return null;
  let found = -1;
  for (let i = 0; i < positions.length; i++) {
    let fixable = false;
    for (let value = 0; value < 26 && !fixable; value++) {
      if (value === positions[i]) continue;
      const candidate = [...positions];
      candidate[i] = value;
      fixable = followsAnyRule(candidate);
    }
    if (fixable) {
      if (found >= 0) return null;
      found = i;
    }
  }
  return found >= 0 ? found : null;
}

export interface LetterOddOne {
  tokens: string[]; // de getoonde rij
  answer: string; // de letter die er niet bij hoort
  distractors: string[]; // drie andere letters uit de getoonde rij
  explanation: string;
  hint: string;
  family: LetterFamily; // altijd 'oddOne'
  baseFamily: LetterFamily; // de regel waarop de rij gebouwd is
  brokenIndex: number;
}

interface OddOneBase {
  family: LetterFamily; // de regel waar de correcte rij op gebouwd is
  offsets: number[]; // de correcte rij
  rule: string; // omschrijving van de regel, voor de uitleg
  focus: string; // zin in de hulptekst die de aanpak wijst, zonder de plaats
}

const FOCUS_STEPS =
  'De sprongen tussen opeenvolgende letters volgen zelf een regel; leid die af uit het begin van de rij, want daar zit de afwijking meestal niet.';

// Negen letters met een vaste stap. Korter kan niet: bij zeven letters is zo'n
// rij ook te lezen als twee verweven reeksen, want een reeks van drie letters
// is met een enkele vervanging altijd kloppend te maken. Dan zijn er twee
// letters aan te wijzen die er niet bij horen.
function constantBase(step: number): OddOneBase {
  return {
    family: 'step',
    offsets: cumulative(Array.from({ length: 8 }, () => step)),
    rule: `een vaste stap van ${stepLabel(step)} in het alfabet`,
    focus: FOCUS_STEPS,
  };
}

function oddConstant(): OddOneBase {
  return constantBase(pick([1, -1]) * randInt(2, 3));
}

// Zeven letters met een stap die elke keer een groter of kleiner wordt. De
// stappen 1..6 tellen op tot 21 en passen dus nog binnen het alfabet.
function oddChanging(): OddOneBase {
  const sign = pick([1, -1]);
  const rising = pick([true, false]);
  const steps = [0, 1, 2, 3, 4, 5].map((i) => sign * (rising ? 1 + i : 6 - i));
  return {
    family: 'changingStep',
    offsets: cumulative(steps),
    rule: `een stap die elke keer ${stepLabel(sign * (rising ? 1 : -1))} verandert (${steps
      .slice(0, 3)
      .map(stepLabel)
      .join(', ')}, ...)`,
    focus: FOCUS_STEPS,
  };
}

// Acht letters met twee stappen die elkaar afwisselen: een kleine en een grote
// stap vooruit, of een stap vooruit en een kleinere terug.
function oddTwoStep(): OddOneBase {
  const zigzag = pick([true, false]);
  const first = zigzag ? randInt(3, 5) : randInt(1, 2);
  const second = zigzag ? -randInt(1, 2) : randInt(4, 5);
  const steps = [0, 1, 2, 3, 4, 5, 6].map((i) => (i % 2 === 0 ? first : second));
  return {
    family: 'alternating',
    offsets: cumulative(steps),
    rule: `twee stappen die elkaar afwisselen (${stepLabel(first)}, ${stepLabel(second)}, ${stepLabel(first)}, ${stepLabel(second)}, ...)`,
    focus:
      'De sprongen tussen opeenvolgende letters blijven niet gelijk maar wisselen elkaar af; leid dat patroon af uit het begin van de rij.',
  };
}

// Acht letters: twee verweven reeksen van elk vier letters, zoals in de echte
// politietest ("A - D - C - H - E - J - G - M").
function oddInterwoven(): OddOneBase {
  const stepA = randInt(2, 4);
  const stepB = pick([true, false]) ? -randInt(1, 3) : randIntExcept(1, 4, stepA);
  const gap = randInt(9, 12);
  const offsets: number[] = [];
  for (let i = 0; i < 4; i++) {
    offsets.push(i * stepA, gap + i * stepB);
  }
  return {
    family: 'interwoven',
    offsets,
    rule: `twee verweven reeksen: de letters op de oneven plaatsen lopen ${stepLabel(stepA)} en die op de even plaatsen ${stepLabel(stepB)}`,
    focus:
      'De letters springen heen en weer: kijk apart naar de letters op de oneven plaatsen en naar die op de even plaatsen.',
  };
}

// Zeven letters waarvan elke stap de som is van de twee vorige stappen.
function oddFibonacci(): OddOneBase {
  const sign = pick([1, -1]);
  const steps = [1, 1, 2, 3, 5, 8].map((s) => sign * s);
  return {
    family: 'fibStep',
    offsets: cumulative(steps),
    rule: `een stap die steeds de som is van de twee vorige stappen (${steps
      .slice(0, 4)
      .map(stepLabel)
      .join(', ')}, ...)`,
    focus: FOCUS_STEPS,
  };
}

// Acht letters met drie stappen die zich herhalen: drie regels tegelijk.
function oddThreeCycle(): OddOneBase {
  const cycle = pick([
    [randInt(2, 3), randInt(4, 6), -randInt(1, 2)],
    [-randInt(1, 2), randInt(4, 6), randInt(2, 3)],
  ]);
  const steps = [0, 1, 2, 3, 4, 5, 6].map((i) => cycle[i % 3]);
  return {
    family: 'cycleThree',
    offsets: cumulative(steps),
    rule: `drie stappen die zich steeds herhalen (${cycle.map(stepLabel).join(', ')}, ${cycle
      .map(stepLabel)
      .join(', ')}, ...)`,
    focus:
      'De sprongen tussen opeenvolgende letters herhalen zich, maar niet om en om; schrijf ze allemaal op en kijk waar het rijtje opnieuw begint.',
  };
}

const oddOneBasesByLevel: Record<number, (() => OddOneBase)[]> = {
  3: [oddConstant, oddChanging],
  4: [oddChanging, oddTwoStep],
  5: [oddTwoStep, oddInterwoven, oddFibonacci],
  6: [oddInterwoven, oddFibonacci, oddThreeCycle],
};

// Hoe ver de bedorven letter van de juiste af ligt. Een verschil van 1 wordt te
// vaak als een kleine verandering van de stap gelezen en valt daarom af.
const CORRUPTIONS = [-4, -3, -2, 2, 3, 4];

interface OddOneAttempt {
  base: OddOneBase;
  broken: number; // plaats van de bedorven letter
  delta: number;
  shiftRandomly: boolean; // legt de rij op een willekeurige plek in het alfabet
}

function makeOddOne({ base, broken, delta, shiftRandomly }: OddOneAttempt): LetterOddOne | null {
  const shown = [...base.offsets];
  shown[broken] += delta;
  const min = Math.min(...shown, ...base.offsets);
  const span = Math.max(...shown, ...base.offsets) - min;
  // Past de rij niet zonder omslag, dan verwerpen we hem: bij deze vraagvorm is
  // een omslag van Z naar A een tweede struikelblok te veel.
  if (span > 25) return null;
  const start = shiftRandomly ? randInt(0, 25 - span) - min : -min;
  const positions = shown.map((o) => o + start);
  // Alle getoonde letters moeten verschillen, anders is niet duidelijk welke
  // letter een optie aanwijst.
  if (new Set(positions).size !== positions.length) return null;
  if (findUniqueBrokenIndex(positions) !== broken) return null;

  const tokens = positions.map(letterAt);
  const correctTokens = base.offsets.map((o) => letterAt(o + start));
  const answer = tokens[broken];
  return {
    tokens,
    answer,
    distractors: shuffle(tokens.filter((_, i) => i !== broken)).slice(0, 3),
    explanation: `De rij volgt ${base.rule}. Volgens die regel hoort de rij ${correctTokens.join(', ')} te zijn. Op de ${ORDINALS[broken]} plaats staat ${answer} in plaats van ${correctTokens[broken]}, dus ${answer} hoort niet in de rij.`,
    hint: `Zet de letters om naar hun plaats in het alfabet: ${positionList(tokens)}. ${base.focus} Reken de rij daarna vanaf het begin zelf door en vergelijk letter voor letter met wat er staat.`,
    family: 'oddOne',
    baseFamily: base.family,
    brokenIndex: broken,
  };
}

// Terugval wanneer het loten geen eenduidige rij oplevert: doorloopt een vaste
// rij met vaste stap net zolang tot de controle slaagt. Geexporteerd zodat de
// test kan vastleggen dat deze weg altijd een geldige opgave geeft.
export function safeLetterOddOne(): LetterOddOne {
  for (const step of [3, -3, 2, -2]) {
    const base = constantBase(step);
    for (const broken of [2, 3, 4, 5, 6, 7]) {
      for (const delta of CORRUPTIONS) {
        const candidate = makeOddOne({ base, broken, delta, shiftRandomly: false });
        if (candidate) return candidate;
      }
    }
  }
  throw new Error('geen eenduidige "welke hoort niet in de rij" te maken');
}

// Bouwt een "welke hoort niet in de rij" voor niveau 3..6. Exporteerbaar voor tests.
export function buildLetterOddOne(level: number): LetterOddOne {
  const bases = oddOneBasesByLevel[Math.min(MAX_LEVEL, Math.max(3, clampLevel(level)))];
  for (let attempt = 0; attempt < 80; attempt++) {
    const base = pick(bases)();
    const candidate = makeOddOne({
      base,
      // Niet de eerste twee letters (daar leidt de gebruiker de regel uit af) en
      // niet de laatste (die is dan niet van "de reeks gaat gewoon door" te
      // onderscheiden).
      broken: randInt(2, base.offsets.length - 2),
      delta: pick(CORRUPTIONS),
      shiftRandomly: true,
    });
    if (candidate) return candidate;
  }
  return safeLetterOddOne();
}

function clampLevel(level: number): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)));
}

// Vanaf niveau 3 is ongeveer een op de vijf letteritems een "welke hoort niet
// in de rij". Die verhouding staat hier en niet in `strategiesByLevel`, omdat
// de twee vraagvormen elk hun eigen bouwer hebben; zo verdringt de nieuwe vorm
// de reeksen niet, ongeacht hoeveel families er per niveau bijkomen.
const ODD_ONE_LEVEL = 3;
const ODD_ONE_IN = 5;

let counter = 0;

export function generateLetters(level: number): Item {
  const clamped = clampLevel(level);
  counter += 1;
  const id = `letters-${clamped}-${counter}`;

  if (clamped >= ODD_ONE_LEVEL && randInt(1, ODD_ONE_IN) === 1) {
    const odd = buildLetterOddOne(clamped);
    const { options, correctIndex } = buildOptions(odd.answer, odd.distractors);
    return {
      id,
      category: 'letters',
      form: 'letterOddOne',
      level: clamped,
      prompt: `Welke letter hoort niet in de rij?\n\n${odd.tokens.join(', ')}`,
      options,
      correctIndex,
      explanation: odd.explanation,
      hint: { strategy: STRATEGY_HINTS.letterOddOne, step: odd.hint },
    };
  }

  const series = buildLetterSeries(clamped);
  const { options, correctIndex } = buildOptions(series.answer, series.distractors);
  return {
    id,
    category: 'letters',
    form: 'letterSeries',
    level: clamped,
    prompt: `Welke letter${series.answer.length > 1 ? 's komen' : ' komt'} er op de plek van het vraagteken?\n\n${series.tokens.join(', ')}, ?`,
    options,
    correctIndex,
    explanation: series.explanation,
    hint: { strategy: STRATEGY_HINTS.letterSeries, step: series.hint },
  };
}

// Hulpfunctie voor tests: bepaalt de positie van een letter.
export { indexOfLetter };

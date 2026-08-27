// Woordrelaties: gecureerde itembanken met analogieen.
//
// Twee vormen, net als in de echte politietest:
//   enkel  "A : B = C : ?"  -> kies het ontbrekende woord
//   dubbel "? : B = C : ?"  -> kies het ontbrekende woordpaar
//
// Niet on-the-fly genereren; kwaliteit is handmatig geborgd in de JSON-banken.

import { MAX_LEVEL, type Item } from '../engine/types';
import { clampLevel } from '../engine/levels';
import { shuffle } from './random';
import { STRATEGY_HINTS } from './hints';
import bank from '../data/verbal.json';
import doubleBank from '../data/verbalDouble.json';

export interface VerbalEntry {
  level: number;
  a: string;
  b: string;
  c: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// Een kandidaatpaar bij een dubbele analogie: `a` vult de linker plek, `d` de
// rechter.
export interface VerbalPair {
  a: string;
  d: string;
}

export interface VerbalDoubleEntry {
  level: number;
  b: string;
  c: string;
  options: VerbalPair[];
  correctIndex: number;
  explanation: string;
}

const entries = bank as VerbalEntry[];
const doubleEntries = doubleBank as VerbalDoubleEntry[];

// Kans dat een woordrelatie-item de dubbele vorm krijgt, per niveau. Een
// dubbele analogie is per definitie zwaarder: de relatie staat nergens compleet
// op papier, dus je moet hem uit de twee gegeven woorden en de kandidaatparen
// samen afleiden. Daarom nooit op de instapniveaus (mbo 3-4 begint bij 1 en 2)
// en daarboven oplopend, zodat de vorm meegroeit met de moeilijkheid.
const DOUBLE_CHANCE: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0.25,
  4: 0.4,
  5: 0.5,
  6: 0.5,
};

// Een sessie is 15 items lang. Een pool die kleiner is dan dat kan binnen een
// sessie niet zonder herhaling worden opgemaakt, dus wordt hij verbreed met de
// buurniveaus tot hij groot genoeg is.
const SESSION_LENGTH = 15;

// Onthoudt welke items recent zijn getoond, zodat herhaling binnen een sessie
// zoveel mogelijk wordt vermeden. Per bank een eigen geschiedenis.
const recentlySingle = new Set<VerbalEntry>();
const recentlyDouble = new Set<VerbalDoubleEntry>();

// Verzamelt items rond het gevraagde niveau tot er genoeg zijn om een sessie
// zonder herhaling mee te vullen. Het niveau van een item blijft zijn eigen
// niveau; alleen de keuze wordt verbreed.
function poolForLevel<T extends { level: number }>(all: T[], level: number): T[] {
  let pool: T[] = [];
  for (let radius = 0; radius < MAX_LEVEL; radius++) {
    const levels = radius === 0 ? [level] : [level - radius, level + radius];
    pool = pool.concat(all.filter((e) => levels.includes(e.level)));
    if (pool.length >= SESSION_LENGTH) return pool;
  }
  return pool.length > 0 ? pool : all;
}

// Kiest een item uit de pool dat nog niet recent is getoond.
function pickUnused<T extends { level: number }>(all: T[], recent: Set<T>, level: number): T {
  const pool = poolForLevel(all, level);
  let available = pool.filter((e) => !recent.has(e));
  if (available.length === 0) {
    // Pool uitgeput: vergeet deze items zodat ze weer aan de beurt komen.
    pool.forEach((e) => recent.delete(e));
    available = pool;
  }
  const entry = available[Math.floor(Math.random() * available.length)];
  recent.add(entry);
  return entry;
}

// Tweede trede van de hulp: doet de eerste denkstap voor met de woorden van dit
// item, maar laat het benoemen van de relatie aan de gebruiker. Dat is precies
// de stap die geoefend moet worden.
//
// De formulering vermijdt bewust voorzetsels als "bij" en "met", omdat die ook
// als antwoord in de banken voorkomen ("zwerm : bij"). Een antwoordwoord dat
// toevallig in de hulptekst staat, is een ongewenste aanwijzing. Exporteerbaar
// zodat de test dat over de hele bank kan controleren.
export function verbalHintStep(entry: VerbalEntry): string {
  return `Maak deze zin voor jezelf af: "${entry.a} verhoudt zich tot ${entry.b} zoals ..." Houd die zin zo kort mogelijk. Zet daarna ${entry.c} vooraan in dezelfde zin en kijk welke van de vier opties hem kloppend maakt. Passen er meerdere, maak je zin dan scherper.`;
}

// Zelfde idee voor de dubbele vorm, maar de eerste denkstap is hier een andere:
// de relatie valt niet af te lezen, dus je begint bij de twee woorden die er
// wel staan en toetst daarna elk paar. Ook hier gelden de woordkeuze-regels
// hierboven: geen enkel antwoord uit de banken mag er als heel woord in staan.
export function verbalDoubleHintStep(entry: VerbalDoubleEntry): string {
  return `Er staan maar twee woorden vast: ${entry.b} en ${entry.c}. Bedenk eerst welke soort verbinding daartussen zou kunnen bestaan. Vul daarna elk paar op de plekken van de vraagtekens in en lees de hele regel voor jezelf na. Streep elk paar weg zodra een van beide helften niet klopt.`;
}

// Een analogie leest als twee helften rond het "=" teken. Met gewone spaties
// mag de regel overal afbreken, en dan belandt er op een smal scherm een los
// vraagteken of een los woord op de volgende regel. Harde spaties binnen elke
// helft laten de regel alleen bij het "=" breken, dus blijft "censuur : handel"
// altijd bij elkaar. Exporteerbaar zodat de tests dezelfde spatie gebruiken.
export const NB = '\u00A0';

function analogyLine(left: string, right: string): string {
  return `${left.replace(/ : /g, `${NB}:${NB}`)} = ${right.replace(/ : /g, `${NB}:${NB}`)}`;
}

let counter = 0;

function generateVerbalSingle(level: number): Item {
  const entry = pickUnused(entries, recentlySingle, level);

  // Opties husselen zodat de juiste positie niet voorspelbaar is.
  const correctValue = entry.options[entry.correctIndex];
  const options = shuffle(entry.options);
  counter += 1;

  return {
    id: `verbal-${entry.level}-${counter}`,
    category: 'verbal',
    form: 'verbalSingle',
    level: entry.level,
    prompt: `Welk woord past op de plek van het vraagteken?\n\n${analogyLine(`${entry.a} : ${entry.b}`, `${entry.c} : ?`)}`,
    options,
    correctIndex: options.indexOf(correctValue),
    explanation: entry.explanation,
    hint: { strategy: STRATEGY_HINTS.verbalSingle, step: verbalHintStep(entry) },
  };
}

export function generateVerbalDouble(level: number): Item {
  const entry = pickUnused(doubleEntries, recentlyDouble, level);

  const correctPair = entry.options[entry.correctIndex];
  const options = shuffle(entry.options).map((pair) => `${pair.a} : ${pair.d}`);
  counter += 1;

  return {
    id: `verbal-dubbel-${entry.level}-${counter}`,
    category: 'verbal',
    form: 'verbalDouble',
    level: entry.level,
    prompt: `Welke twee woorden passen op de plekken van de vraagtekens?\n\n${analogyLine(`? : ${entry.b}`, `${entry.c} : ?`)}`,
    options,
    correctIndex: options.indexOf(`${correctPair.a} : ${correctPair.d}`),
    explanation: entry.explanation,
    hint: { strategy: STRATEGY_HINTS.verbalDouble, step: verbalDoubleHintStep(entry) },
  };
}

export function generateVerbal(level: number): Item {
  const clamped = clampLevel(level);
  const wantsDouble = Math.random() < DOUBLE_CHANCE[clamped];
  return wantsDouble ? generateVerbalDouble(clamped) : generateVerbalSingle(clamped);
}

// Voor tests: ruwe toegang tot de banken.
export function verbalBank(): VerbalEntry[] {
  return entries;
}

export function verbalDoubleBank(): VerbalDoubleEntry[] {
  return doubleEntries;
}

// Vergeet welke items recent zijn getoond. Alleen bedoeld voor tests; in de app
// blijft de geschiedenis juist staan, zodat een volgende sessie andere items
// laat zien.
export function resetVerbalHistory(): void {
  recentlySingle.clear();
}

export function resetVerbalDoubleHistory(): void {
  recentlyDouble.clear();
}

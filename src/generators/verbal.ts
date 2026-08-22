// Woordrelaties: gecureerde itembank met analogieen "A : B = C : ?".
// Niet on-the-fly genereren; kwaliteit is handmatig geborgd in verbal.json.

import type { Item } from '../engine/types';
import { shuffle } from './random';
import { STRATEGY_HINTS } from './hints';
import bank from '../data/verbal.json';

export interface VerbalEntry {
  level: number;
  a: string;
  b: string;
  c: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const entries = bank as VerbalEntry[];

// Onthoudt welke items recent zijn getoond, zodat herhaling binnen een sessie
// zoveel mogelijk wordt vermeden.
const recentlyUsed = new Set<number>();

function entryKey(entry: VerbalEntry): number {
  return entries.indexOf(entry);
}

// Kiest het dichtstbijzijnde niveau waarvoor nog items bestaan.
function poolForLevel(level: number): VerbalEntry[] {
  for (let radius = 0; radius < 5; radius++) {
    for (const candidate of [level - radius, level + radius]) {
      const pool = entries.filter((e) => e.level === candidate);
      if (pool.length > 0) return pool;
    }
  }
  return entries;
}

// Tweede trede van de hulp: doet de eerste denkstap voor met de woorden van dit
// item, maar laat het benoemen van de relatie aan de gebruiker. Dat is precies
// de stap die geoefend moet worden.
//
// De formulering vermijdt bewust voorzetsels als "bij" en "met", omdat die ook
// als antwoord in de bank voorkomen ("zwerm : bij"). Een antwoordwoord dat
// toevallig in de hulptekst staat, is een ongewenste aanwijzing. Exporteerbaar
// zodat de test dat over de hele bank kan controleren.
export function verbalHintStep(entry: VerbalEntry): string {
  return `Maak deze zin voor jezelf af: "${entry.a} verhoudt zich tot ${entry.b} zoals ..." Houd die zin zo kort mogelijk. Zet daarna ${entry.c} vooraan in dezelfde zin en kijk welke van de vier opties hem kloppend maakt. Passen er meerdere, maak je zin dan scherper.`;
}

let counter = 0;

export function generateVerbal(level: number): Item {
  const clamped = Math.min(5, Math.max(1, Math.round(level)));
  const pool = poolForLevel(clamped);

  let available = pool.filter((e) => !recentlyUsed.has(entryKey(e)));
  if (available.length === 0) {
    // Pool uitgeput: reset de geschiedenis voor dit niveau.
    pool.forEach((e) => recentlyUsed.delete(entryKey(e)));
    available = pool;
  }

  const entry = available[Math.floor(Math.random() * available.length)];
  recentlyUsed.add(entryKey(entry));

  // Opties husselen zodat de juiste positie niet voorspelbaar is.
  const correctValue = entry.options[entry.correctIndex];
  const options = shuffle(entry.options);
  counter += 1;

  return {
    id: `verbal-${entry.level}-${counter}`,
    category: 'verbal',
    level: entry.level,
    prompt: `Welk woord past op de plek van het vraagteken?\n\n${entry.a} : ${entry.b} = ${entry.c} : ?`,
    options,
    correctIndex: options.indexOf(correctValue),
    explanation: entry.explanation,
    hint: { strategy: STRATEGY_HINTS.verbal, step: verbalHintStep(entry) },
  };
}

// Voor tests: ruwe toegang tot de bank.
export function verbalBank(): VerbalEntry[] {
  return entries;
}

// Vergeet welke items recent zijn getoond. Alleen bedoeld voor tests; in de app
// blijft de geschiedenis juist staan, zodat een volgende sessie andere items
// laat zien.
export function resetVerbalHistory(): void {
  recentlyUsed.clear();
}

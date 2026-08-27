// Betekenis van de niveaus 1..6 in indicatief opleidingsniveau. Let op: dit is
// een richtlijn (de niveaus zijn aannames tot er echte kalibratiedata is),
// bedoeld om "niveau 3" begrijpelijker te maken voor de gebruiker.

import { MAX_LEVEL, MIN_LEVEL } from './types';

export const LEVEL_LABELS: Record<number, string> = {
  1: 'vmbo / mbo-2',
  2: 'mbo 2-3',
  3: 'mbo 3-4',
  4: 'mbo-4 / hbo',
  5: 'hbo',
  6: 'hbo+ / wo',
};

// Maakt van een (mogelijk continue) schatting een heel niveau binnen de schaal.
// De ondergrens is instelbaar: sommige vraagvormen bestaan pas vanaf niveau 3
// (cijfermatrix, "welke hoort niet in de rij"), en die geven `min: 3` mee.
// Let op: dit is bewust mét afronding. De continue schatting van de staircase
// wordt elders zonder afronding geknipt, want daar gaat elke tiende mee.
export function clampLevel(level: number, min: number = MIN_LEVEL): number {
  return Math.min(MAX_LEVEL, Math.max(min, Math.round(level)));
}

export function levelLabel(level: number): string {
  return LEVEL_LABELS[clampLevel(level)];
}

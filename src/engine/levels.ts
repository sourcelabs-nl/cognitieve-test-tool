// Betekenis van de niveaus 1..5 in indicatief opleidingsniveau. Let op: dit is
// een richtlijn (de niveaus zijn aannames tot er echte kalibratiedata is),
// bedoeld om "niveau 3" begrijpelijker te maken voor de gebruiker.

import { MAX_LEVEL, MIN_LEVEL } from './types';

export const LEVEL_LABELS: Record<number, string> = {
  1: 'vmbo / mbo-2',
  2: 'mbo 2-3',
  3: 'mbo 3-4',
  4: 'mbo-4 / hbo',
  5: 'hbo en hoger',
};

export function levelLabel(level: number): string {
  const clamped = Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)));
  return LEVEL_LABELS[clamped];
}

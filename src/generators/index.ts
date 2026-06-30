// Registry: koppelt een categorie aan zijn generator. 'mixed' kiest per item
// beurtelings een van de drie categorieen.

import type { Category, Item, ItemCategory } from '../engine/types';
import { generateNumeric } from './numeric';
import { generateLetters } from './letters';
import { generateVerbal } from './verbal';

type GeneratorFn = (level: number) => Item;

const generators: Record<ItemCategory, GeneratorFn> = {
  numeric: generateNumeric,
  letters: generateLetters,
  verbal: generateVerbal,
};

const mixedOrder: ItemCategory[] = ['numeric', 'letters', 'verbal'];

// Levert een item op het gevraagde niveau voor de categorie. Voor 'mixed'
// bepaalt itemIndex welke categorie aan de beurt is.
export function generate(category: Category, level: number, itemIndex = 0): Item {
  if (category === 'mixed') {
    const picked = mixedOrder[itemIndex % mixedOrder.length];
    return generators[picked](level);
  }
  return generators[category](level);
}

export const categoryLabels: Record<Category, string> = {
  numeric: 'Cijferpatronen',
  letters: 'Letterpatronen',
  verbal: 'Woordrelaties',
  mixed: 'Gemengd',
};

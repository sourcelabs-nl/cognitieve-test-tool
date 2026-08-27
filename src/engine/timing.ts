// Tijdslimiet per vraag, alleen in testmodus.
//
// De echte cognitieve capaciteitentest van de politie is tijdgebonden: de
// instructies mag je rustig lezen, maar de opgaven staan onder tijdsdruk en de
// tijd per vraag loopt mee met de moeilijkheid. Wie daarvoor oefent moet dat
// kunnen nabootsen.
//
// In oefenmodus staat er bewust geen klok: daar wil je juist nadenken, hulp
// kunnen vragen en de uitleg lezen. Tijdsdruk zou dat leren in de weg zitten.

import type { Item, ItemForm } from './types';

// Ruim genoeg om te lezen en te redeneren, krap genoeg om tempo af te dwingen.
export const BASE_LIMIT_MS = 30_000;

// Elk niveau erbij geeft er tijd bij: een reeks met een regel uit twee stappen
// kost nu eenmaal meer denkwerk dan een vaste stap.
export const PER_LEVEL_MS = 8_000;

// Sommige vraagvormen kosten vooral LEEStijd voordat het denken begint: een
// raster van negen vakjes, een rij van negen tekens, of vier woordparen in
// plaats van vier losse woorden. Zonder deze toeslag straft de klok het formaat
// van de opgave in plaats van de moeilijkheid ervan.
const FORM_EXTRA_MS: Partial<Record<ItemForm, number>> = {
  numericGrid: 10_000,
  numericOddOne: 10_000,
  letterOddOne: 10_000,
  verbalDouble: 10_000,
};

export function timeLimitMs(item: Pick<Item, 'level' | 'form'>): number {
  return BASE_LIMIT_MS + (item.level - 1) * PER_LEVEL_MS + (FORM_EXTRA_MS[item.form] ?? 0);
}

// Een vraag waarop de tijd afliep. Geen enkele optie heeft deze index, dus hij
// telt als fout zonder dat het algoritme of de score er iets voor hoeft te weten.
export const NO_ANSWER = -1;

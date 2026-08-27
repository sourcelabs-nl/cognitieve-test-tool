// Gedeelde tekst-hulpjes voor uitleg bij gegenereerde items.

// Schrijft een stap als "+3" of "-3", zodat uitleg met negatieve stappen
// leesbaar blijft (niet "+-3").
export function stepLabel(step: number): string {
  return step < 0 ? `-${-step}` : `+${step}`;
}

// Rangtelwoorden voor rijen, kolommen en plekken in een rij, geindexeerd vanaf
// 0 zodat ORDINALS[i] bij positie i hoort. Uitgeschreven en niet als "3e":
// uitleg en hulptekst zijn lopende zinnen die de gebruiker leest (en laat
// voorlezen), en daarin leest "op de derde plek" prettiger dan "op de 3e plek".
// Lang genoeg voor de langste rij die we tonen (elf letters plus vraagteken).
export const ORDINALS = [
  'eerste',
  'tweede',
  'derde',
  'vierde',
  'vijfde',
  'zesde',
  'zevende',
  'achtste',
  'negende',
  'tiende',
  'elfde',
  'twaalfde',
];

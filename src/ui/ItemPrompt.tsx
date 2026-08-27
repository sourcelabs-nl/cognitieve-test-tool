// De opgave van een item: de vraagtekst, de reeks, en bij een raster de vakjes.
//
// Dit stond eerder twee keer, in het vraagscherm en in de voorbeeldvraag van het
// introscherm. Die kopieen liepen uit elkaar: de intro kende het raster niet en
// gebruikte voor woordrelaties de brede letterafstand die alleen bij losse
// cijfers en letters hoort. Een item hoort er overal hetzelfde uit te zien, dus
// staat de vertaling van item naar opmaak hier, op een plek.

import type { CSSProperties } from 'react';
import type { Item, ItemForm } from '../engine/types';

// Welke opmaak hoort bij welke vraagvorm. Bewust op `form` en niet op
// `category`: `form` is de fijnere en enige echte discriminator, en twee
// verschillende discriminatoren voor verwante beslissingen leest als twee
// losstaande regels terwijl het er een is.
//
// De klassenamen staan hier en niet in `engine/types.ts`: dat is het contract
// tussen de generatoren en de tests, en dat hoort niets van CSS te weten.
interface Layout {
  sequence: string; // klasse voor de opgaveregel
  options: string; // klasse voor het antwoordenraster
}

const SERIES: Layout = { sequence: 'prompt-sequence', options: 'options' };
// Woordrelaties zijn tekst, geen reeks: normale letterafstand, iets kleiner.
const WORDS: Layout = { sequence: 'prompt-sequence prompt-sequence-words', options: 'options' };

const LAYOUTS: Record<ItemForm, Layout> = {
  numericSeries: SERIES,
  numericGrid: SERIES,
  numericOddOne: SERIES,
  letterSeries: SERIES,
  letterOddOne: SERIES,
  verbalSingle: WORDS,
  // Woordparen krijgen de volle breedte, anders belandt het tweede woord van een
  // paar op een eigen regel en valt het paar uit elkaar.
  verbalDouble: { sequence: WORDS.sequence, options: 'options options-stacked' },
};

export function layoutFor(form: ItemForm): Layout {
  return LAYOUTS[form];
}

export function ItemPrompt({ item }: { item: Item }) {
  const { sequence } = layoutFor(item.form);

  return (
    <>
      {item.prompt.split('\n').map((line, i) => (
        <p key={i} className={i === 0 ? 'prompt-text' : sequence}>
          {line}
        </p>
      ))}
      {item.grid && (
        // Bewust een div-grid en geen <table>: het raster is een plaatje van de
        // opgave, geen gegevenstabel om doorheen te navigeren. Een label plus de
        // cellen in leesvolgorde vertelt alles wat nodig is; rij- en kolomkoppen
        // die een tabel verwacht zijn er niet.
        <div
          className="prompt-grid"
          role="group"
          aria-label="Raster met getallen"
          style={{ '--cols': item.grid.cols } as CSSProperties}
        >
          {item.grid.cells.map((cell, i) =>
            cell === '?' ? (
              <span key={i} className="grid-cell grid-cell-missing" aria-label="gevraagd vakje">
                ?
              </span>
            ) : (
              <span key={i} className="grid-cell">
                {cell}
              </span>
            ),
          )}
        </div>
      )}
    </>
  );
}

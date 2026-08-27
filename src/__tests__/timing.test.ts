import { describe, it, expect } from 'vitest';
import { BASE_LIMIT_MS, NO_ANSWER, PER_LEVEL_MS, timeLimitMs } from '../engine/timing';
import { MAX_LEVEL, MIN_LEVEL, type ItemForm } from '../engine/types';

const FORMS: ItemForm[] = [
  'numericSeries',
  'numericGrid',
  'numericOddOne',
  'letterSeries',
  'letterOddOne',
  'verbalSingle',
  'verbalDouble',
];

describe('tijdslimiet per vraag', () => {
  it('geeft op het laagste niveau de basistijd voor een gewone reeks', () => {
    expect(timeLimitMs({ level: MIN_LEVEL, form: 'numericSeries' })).toBe(BASE_LIMIT_MS);
  });

  it('geeft meer tijd naarmate het niveau stijgt', () => {
    for (let level = MIN_LEVEL; level < MAX_LEVEL; level++) {
      const here = timeLimitMs({ level, form: 'numericSeries' });
      const next = timeLimitMs({ level: level + 1, form: 'numericSeries' });
      expect(next - here).toBe(PER_LEVEL_MS);
    }
  });

  // Een raster, een lange rij of vier woordparen kosten leestijd voordat het
  // denken begint. Zonder toeslag straft de klok het formaat in plaats van de
  // moeilijkheid.
  it('geeft de vormen met veel leeswerk extra tijd', () => {
    const roomier: ItemForm[] = ['numericGrid', 'numericOddOne', 'letterOddOne', 'verbalDouble'];
    for (const form of roomier) {
      expect(timeLimitMs({ level: 4, form })).toBeGreaterThan(
        timeLimitMs({ level: 4, form: 'numericSeries' }),
      );
    }
  });

  it('geeft elke vorm op elk niveau een werkbare tijd', () => {
    for (const form of FORMS) {
      for (let level = MIN_LEVEL; level <= MAX_LEVEL; level++) {
        const limit = timeLimitMs({ level, form });
        // Niet zo kort dat lezen al niet lukt, niet zo lang dat de druk weg is.
        expect(limit).toBeGreaterThanOrEqual(20_000);
        expect(limit).toBeLessThanOrEqual(120_000);
      }
    }
  });

  // Het algoritme en de score hoeven niets van "tijd om" te weten: een index
  // die geen enkele optie heeft, telt vanzelf als fout.
  it('is met NO_ANSWER nooit gelijk aan een geldige optie-index', () => {
    expect(NO_ANSWER).toBeLessThan(0);
  });
});

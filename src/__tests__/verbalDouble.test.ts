import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateVerbal,
  generateVerbalDouble,
  verbalDoubleBank,
  resetVerbalHistory,
  resetVerbalDoubleHistory,
  NB,
} from '../generators/verbal';

// Verwachte opbouw van de bank: het zwaartepunt ligt hoog, want een dubbele
// analogie is zwaarder dan een enkele. Niveau 1 en 2 doen niet mee: die zijn de
// instap voor mbo 3-4.
const EXPECTED_PER_LEVEL: Record<number, number> = { 3: 8, 4: 12, 5: 12, 6: 8 };

describe('dubbele woordrelaties-bank', () => {
  beforeEach(() => {
    resetVerbalHistory();
    resetVerbalDoubleHistory();
  });

  it('elk item heeft 4 gevulde paren en een geldige correctIndex', () => {
    for (const entry of verbalDoubleBank()) {
      expect(entry.options).toHaveLength(4);
      for (const pair of entry.options) {
        expect(pair.a.length).toBeGreaterThan(0);
        expect(pair.d.length).toBeGreaterThan(0);
      }
      expect(entry.correctIndex).toBeGreaterThanOrEqual(0);
      expect(entry.correctIndex).toBeLessThan(4);
      expect(entry.b.length).toBeGreaterThan(0);
      expect(entry.c.length).toBeGreaterThan(0);
    }
  });

  it('elk niveau ligt tussen 3 en 6 en de verdeling klopt', () => {
    const counts: Record<number, number> = {};
    for (const entry of verbalDoubleBank()) {
      expect(entry.level).toBeGreaterThanOrEqual(3);
      expect(entry.level).toBeLessThanOrEqual(6);
      counts[entry.level] = (counts[entry.level] ?? 0) + 1;
    }
    expect(counts).toEqual(EXPECTED_PER_LEVEL);
  });

  it('geen dubbele opgaven in de bank', () => {
    const stems = verbalDoubleBank().map((e) => `${e.b}=${e.c}`);
    expect(new Set(stems).size).toBe(stems.length);
  });

  it('binnen een item is geen enkel paar twee keer aanwezig', () => {
    for (const entry of verbalDoubleBank()) {
      const rendered = entry.options.map((p) => `${p.a} : ${p.d}`);
      expect(new Set(rendered).size).toBe(4);
    }
  });

  // De uitleg moet de relatie benoemen en zeggen waarom de belangrijkste
  // afleider afvalt. Een uitleg van een paar woorden doet dat niet.
  it('elke uitleg is gevuld en niet triviaal kort', () => {
    for (const entry of verbalDoubleBank()) {
      expect(entry.explanation.length).toBeGreaterThan(60);
    }
  });

  it('generateVerbalDouble levert het juiste paar na husselen', () => {
    for (let level = 3; level <= 6; level++) {
      for (let i = 0; i < 50; i++) {
        const item = generateVerbalDouble(level);
        expect(item.form).toBe('verbalDouble');
        expect(item.options).toHaveLength(4);
        expect(item.options[item.correctIndex]).toContain(' : ');
        expect(item.prompt).toContain(`?${NB}:${NB}`);
        expect(item.explanation.length).toBeGreaterThan(0);
      }
    }
  });

  it('generateVerbal levert op niveau 5 zowel enkele als dubbele items', () => {
    const forms = new Set<string>();
    for (let i = 0; i < 200; i++) forms.add(generateVerbal(5).form);
    expect(forms).toContain('verbalSingle');
    expect(forms).toContain('verbalDouble');
  });

  it('generateVerbal levert op niveau 1 en 2 nooit een dubbel item', () => {
    for (const level of [1, 2]) {
      for (let i = 0; i < 300; i++) {
        expect(generateVerbal(level).form).toBe('verbalSingle');
      }
    }
  });
});

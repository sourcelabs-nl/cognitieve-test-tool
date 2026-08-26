import { describe, it, expect, beforeEach } from 'vitest';
import { MAX_LEVEL } from '../engine/types';
import {
  generateVerbal,
  verbalBank,
  resetVerbalHistory,
  resetVerbalDoubleHistory,
} from '../generators/verbal';

describe('woordrelaties-bank', () => {
  beforeEach(() => {
    resetVerbalHistory();
    resetVerbalDoubleHistory();
  });

  it('elk item heeft 4 unieke opties en een geldige correctIndex', () => {
    for (const entry of verbalBank()) {
      expect(entry.options).toHaveLength(4);
      expect(new Set(entry.options).size).toBe(4);
      expect(entry.correctIndex).toBeGreaterThanOrEqual(0);
      expect(entry.correctIndex).toBeLessThan(4);
      expect(entry.level).toBeGreaterThanOrEqual(1);
      expect(entry.level).toBeLessThanOrEqual(MAX_LEVEL);
      expect(entry.explanation.length).toBeGreaterThan(0);
      // Het gevraagde woord mag niet al in de opgave staan.
      for (const word of [entry.a, entry.b, entry.c]) {
        expect(entry.options[entry.correctIndex]).not.toBe(word);
      }
    }
  });

  // De bank is de enige niet-generatieve categorie: gezien is op. Er moeten dus
  // ruim genoeg items per niveau zijn om herhaling binnen een sessie (15 items)
  // te voorkomen.
  it('elk niveau heeft meer items dan een sessie lang is', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const count = verbalBank().filter((e) => e.level === level).length;
      expect(count).toBeGreaterThan(15);
    }
  });

  it('geen dubbele opgaven in de bank', () => {
    const stems = verbalBank().map((e) => `${e.a}:${e.b}=${e.c}`);
    expect(new Set(stems).size).toBe(stems.length);
  });

  it('generateVerbal levert een item met het juiste antwoord na husselen', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      for (let i = 0; i < 50; i++) {
        const item = generateVerbal(level);
        expect(item.category).toBe('verbal');
        expect(['verbalSingle', 'verbalDouble']).toContain(item.form);
        expect(item.options).toHaveLength(4);
        expect(item.options[item.correctIndex]).toBeTruthy();
        expect(item.prompt).toContain('?');
        expect(item.explanation.length).toBeGreaterThan(0);
      }
    }
  });

  // De vorm bepaalt hoe de opgave eruitziet: bij een enkele analogie ontbreekt
  // een woord, bij een dubbele twee, en dan is elke optie een woordpaar.
  it('de vorm past bij de opgave en de opties', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      for (let i = 0; i < 50; i++) {
        const item = generateVerbal(level);
        if (item.form === 'verbalDouble') {
          expect(item.prompt).toContain('? : ');
          for (const option of item.options) expect(option).toContain(' : ');
        } else {
          expect(item.prompt).not.toContain('? : ');
          expect(item.prompt.endsWith(' : ?')).toBe(true);
          for (const option of item.options) expect(option).not.toContain(' : ');
        }
      }
    }
  });

  it('herhaalt binnen een sessie van 15 items geen enkele opgave', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const prompts = Array.from({ length: 15 }, () => generateVerbal(level).prompt);
      expect(new Set(prompts).size).toBe(15);
    }
  });
});

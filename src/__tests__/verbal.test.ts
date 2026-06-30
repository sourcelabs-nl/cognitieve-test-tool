import { describe, it, expect } from 'vitest';
import { generateVerbal, verbalBank } from '../generators/verbal';

describe('woordrelaties-bank', () => {
  it('elke item heeft 4 opties en een geldige correctIndex', () => {
    for (const entry of verbalBank()) {
      expect(entry.options).toHaveLength(4);
      expect(new Set(entry.options).size).toBe(4);
      expect(entry.correctIndex).toBeGreaterThanOrEqual(0);
      expect(entry.correctIndex).toBeLessThan(4);
      expect(entry.level).toBeGreaterThanOrEqual(1);
      expect(entry.level).toBeLessThanOrEqual(5);
      expect(entry.explanation.length).toBeGreaterThan(0);
    }
  });

  it('elk niveau 1..5 heeft minstens 4 items', () => {
    for (let level = 1; level <= 5; level++) {
      const count = verbalBank().filter((e) => e.level === level).length;
      expect(count).toBeGreaterThanOrEqual(4);
    }
  });

  it('generateVerbal levert een item met het juiste antwoord na husselen', () => {
    for (let level = 1; level <= 5; level++) {
      const item = generateVerbal(level);
      expect(item.options).toHaveLength(4);
      expect(item.options[item.correctIndex]).toBeTruthy();
      expect(item.prompt).toContain('?');
    }
  });
});

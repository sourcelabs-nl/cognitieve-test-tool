import { describe, it, expect } from 'vitest';
import { MAX_LEVEL } from '../engine/types';
import { generate } from '../generators';
import { STRATEGY_HINTS } from '../generators/hints';
import {
  verbalBank,
  verbalDoubleBank,
  verbalHintStep,
  verbalDoubleHintStep,
} from '../generators/verbal';
import type { ItemCategory } from '../engine/types';

const CATEGORIES: ItemCategory[] = ['numeric', 'letters', 'verbal'];

describe('getrapte hulp bij items', () => {
  it('elk item heeft beide tredes hulp gevuld', () => {
    for (const category of CATEGORIES) {
      for (let level = 1; level <= MAX_LEVEL; level++) {
        for (let i = 0; i < 200; i++) {
          const item = generate(category, level);
          expect(item.hint.strategy.length).toBeGreaterThan(40);
          expect(item.hint.step.length).toBeGreaterThan(40);
        }
      }
    }
  });

  // De eerste trede is per vraagvorm vast. Zou hij per strategie verschillen,
  // dan verklapte hij welke familie eronder zit en was de vraag half opgelost.
  it('de eerste trede is de vaste tekst van de vraagvorm', () => {
    for (const category of CATEGORIES) {
      for (let level = 1; level <= MAX_LEVEL; level++) {
        for (let i = 0; i < 50; i++) {
          const item = generate(category, level);
          expect(item.hint.strategy).toBe(STRATEGY_HINTS[item.form]);
        }
      }
    }
  });

  it('de tweede trede is niet simpelweg de uitleg van het antwoord', () => {
    for (const category of CATEGORIES) {
      for (let level = 1; level <= MAX_LEVEL; level++) {
        for (let i = 0; i < 200; i++) {
          const item = generate(category, level);
          expect(item.hint.step).not.toBe(item.explanation);
          expect(item.hint.step).not.toContain(item.explanation);
          expect(item.explanation).not.toContain(item.hint.step);
        }
      }
    }
  });

  // Elke uitleg sluit af met "= <antwoord>". Een hint mag die stap nooit zetten:
  // dat is precies de stap die de gebruiker zelf moet doen.
  it('de hint rekent het antwoord niet voor', () => {
    for (const category of CATEGORIES) {
      for (let level = 1; level <= MAX_LEVEL; level++) {
        for (let i = 0; i < 300; i++) {
          const item = generate(category, level);
          const answer = item.options[item.correctIndex];
          expect(item.hint.step).not.toContain(`= ${answer}`);
          expect(item.hint.strategy).not.toContain(`= ${answer}`);
        }
      }
    }
  });

  // Woordrelaties hebben onderscheidende antwoorden, dus daar kan hard worden
  // gecontroleerd dat het antwoord niet in de hulptekst staat. De controle gaat
  // over beide banken, niet over een steekproef, en op hele woorden: "hand" mag
  // wel voorkomen als deel van "handschoen", want dat woord staat in de opgave.
  //
  // Deze test ving een echte fout: de hulptekst gebruikte "hoort bij", terwijl
  // "bij" het antwoord is van "kudde : schaap = zwerm : ?".
  //
  // Per item wordt de hulptekst van dat item gecontroleerd; de twee vaste
  // aanpak-teksten worden tegen alle antwoorden van beide banken gehouden,
  // want die teksten kan iedere gebruiker bij elk item opvragen. Een antwoord
  // van het ene item mag wel in de hulptekst van een ander item staan: dat is
  // geen aanwijzing, en de opgaven delen nu eenmaal woorden.
  it('bij woordrelaties staat geen enkel antwoord uit de banken in de hulptekst', () => {
    const asWholeWord = (word: string): RegExp =>
      new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

    const sharedTexts = [STRATEGY_HINTS.verbalSingle, STRATEGY_HINTS.verbalDouble];
    const answers: string[] = [];

    for (const entry of verbalBank()) {
      const answer = entry.options[entry.correctIndex];
      answers.push(answer);
      expect(verbalHintStep(entry)).not.toMatch(asWholeWord(answer));
    }

    for (const entry of verbalDoubleBank()) {
      const pair = entry.options[entry.correctIndex];
      answers.push(pair.a, pair.d);
      const step = verbalDoubleHintStep(entry);
      expect(step).not.toMatch(asWholeWord(pair.a));
      expect(step).not.toMatch(asWholeWord(pair.d));
    }

    for (const answer of answers) {
      for (const text of sharedTexts) {
        expect(text).not.toMatch(asWholeWord(answer));
      }
    }
  });
});

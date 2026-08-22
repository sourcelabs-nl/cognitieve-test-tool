import { describe, it, expect } from 'vitest';
import {
  scoreAnswer,
  BASE_POINTS,
  LEVEL_BONUS,
  FAST_BONUS,
  MEDIUM_BONUS,
  MAX_COMBO_MULTIPLIER,
  HINT_PENALTY,
} from '../engine/scoring';

describe('scoring', () => {
  it('een fout antwoord levert 0 punten op en breekt de reeks', () => {
    const r = scoreAnswer({ correct: false, level: 5, responseMs: 1000, streakBefore: 4 });
    expect(r.points).toBe(0);
    expect(r.streakAfter).toBe(0);
  });

  it('moeilijkere items leveren meer punten op', () => {
    const easy = scoreAnswer({ correct: true, level: 1, responseMs: 8000, streakBefore: 0 });
    const hard = scoreAnswer({ correct: true, level: 5, responseMs: 8000, streakBefore: 0 });
    expect(hard.points).toBeGreaterThan(easy.points);
  });

  it('sneller antwoorden geeft een snelheidsbonus', () => {
    const fast = scoreAnswer({ correct: true, level: 2, responseMs: 1000, streakBefore: 0 });
    const slow = scoreAnswer({ correct: true, level: 2, responseMs: 9000, streakBefore: 0 });
    expect(fast.speedBonus).toBe(FAST_BONUS);
    expect(slow.speedBonus).toBe(0);
    expect(fast.points).toBeGreaterThan(slow.points);
  });

  it('basispunten kloppen zonder bonussen (traag, niveau 1, eerste in reeks)', () => {
    const r = scoreAnswer({ correct: true, level: 1, responseMs: 9000, streakBefore: 0 });
    expect(r.points).toBe(BASE_POINTS + LEVEL_BONUS);
    expect(r.streakAfter).toBe(1);
  });

  it('een reeks bouwt een combo-multiplier op die gedekt is', () => {
    const single = scoreAnswer({ correct: true, level: 3, responseMs: 5000, streakBefore: 0 });
    const combo = scoreAnswer({ correct: true, level: 3, responseMs: 5000, streakBefore: 5 });
    expect(combo.points).toBeGreaterThan(single.points);

    const base = BASE_POINTS + 3 * LEVEL_BONUS + MEDIUM_BONUS;
    const huge = scoreAnswer({ correct: true, level: 3, responseMs: 5000, streakBefore: 100 });
    expect(huge.points).toBe(Math.round(base * MAX_COMBO_MULTIPLIER));
  });

  it('met hulp tellen de punten half, maar de reeks blijft staan', () => {
    const input = { correct: true, level: 4, responseMs: 5000, streakBefore: 3 };
    const solo = scoreAnswer(input);
    const helped = scoreAnswer({ ...input, hintUsed: true });
    expect(helped.points).toBe(Math.round(solo.points * HINT_PENALTY));
    expect(helped.streakAfter).toBe(solo.streakAfter);
  });

  it('hulp bij een fout antwoord verandert niets: het blijft 0 punten', () => {
    const r = scoreAnswer({
      correct: false,
      level: 4,
      responseMs: 5000,
      streakBefore: 3,
      hintUsed: true,
    });
    expect(r.points).toBe(0);
    expect(r.streakAfter).toBe(0);
  });

  it('hulp is nooit voordeliger dan het zelf oplossen', () => {
    for (let level = 1; level <= 5; level++) {
      for (const responseMs of [1000, 5000, 9000]) {
        const input = { correct: true, level, responseMs, streakBefore: 2 };
        expect(scoreAnswer({ ...input, hintUsed: true }).points).toBeLessThan(
          scoreAnswer(input).points,
        );
      }
    }
  });
});

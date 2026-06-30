// Spelscore: geeft de tool een spelgevoel zonder de niveau-schatting te raken.
// Een goed antwoord levert punten op, opgebouwd uit een paar variaties:
//   1. Niveau-bonus  - moeilijkere items zijn meer waard.
//   2. Snelheidsbonus - sneller goed antwoorden levert extra punten op.
//   3. Reeks-bonus    - opeenvolgende goede antwoorden bouwen een combo op.
// Een fout antwoord levert 0 punten op en breekt de reeks.

export const BASE_POINTS = 100;
export const LEVEL_BONUS = 20; // per niveau (1..5)

// Snelheidsdrempels: onder de drempel hoort de bijbehorende bonus.
export const FAST_MS = 3000;
export const MEDIUM_MS = 6000;
export const FAST_BONUS = 50;
export const MEDIUM_BONUS = 25;

export const COMBO_STEP = 0.1; // elke extra goede in de reeks: +10%
export const MAX_COMBO_MULTIPLIER = 2.0; // gedekt op 2x

export interface ScoreInput {
  correct: boolean;
  level: number; // niveau van het item (1..5)
  responseMs: number;
  streakBefore: number; // aantal goede antwoorden direct hiervoor
}

export interface ScoreResult {
  points: number; // punten voor dit antwoord
  streakAfter: number; // nieuwe reekslengte
  speedBonus: number; // los teruggegeven voor feedback in de UI
}

function speedBonusFor(responseMs: number): number {
  if (responseMs <= FAST_MS) return FAST_BONUS;
  if (responseMs <= MEDIUM_MS) return MEDIUM_BONUS;
  return 0;
}

function comboMultiplier(streak: number): number {
  // streak 1 -> 1.0x, streak 2 -> 1.1x, ... gedekt op MAX_COMBO_MULTIPLIER.
  return Math.min(MAX_COMBO_MULTIPLIER, 1 + (streak - 1) * COMBO_STEP);
}

export function scoreAnswer(input: ScoreInput): ScoreResult {
  if (!input.correct) {
    return { points: 0, streakAfter: 0, speedBonus: 0 };
  }
  const streakAfter = input.streakBefore + 1;
  const speedBonus = speedBonusFor(input.responseMs);
  const raw = BASE_POINTS + input.level * LEVEL_BONUS + speedBonus;
  const points = Math.round(raw * comboMultiplier(streakAfter));
  return { points, streakAfter, speedBonus };
}

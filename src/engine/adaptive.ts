// Adaptief niveau-schatting via een weighted up/down staircase
// (Kaernbach 1991; Levitt 1971 transformed up-down). De op- en neerstap zijn
// asymmetrisch zodat de schatting convergeert naar het niveau waarop de
// kandidaat ~75% goed scoort. De stap halveert bij elke richtingsomkering
// zodat de schatting inschommelt rond het werkelijke niveau.

import {
  MIN_LEVEL,
  MAX_LEVEL,
  type Answer,
  type Category,
  type Item,
  type Mode,
  type SessionResult,
  type SessionState,
} from './types';

export const INITIAL_ESTIMATE = 2.5;
export const INITIAL_STEP = 0.8;
export const MIN_STEP = 0.1; // ondergrens; bij deze stap is de schatting stabiel
export const TARGET_CORRECT = 0.75; // gewenst slagingspercentage
export const MIN_ITEMS = 10;
export const MAX_ITEMS = 15;

// Verhouding opstap/neerstap. Bij evenwicht geldt p*up = (1-p)*down, dus
// up = down * (1-p)/p. Voor p=0.75 is de opstap een derde van de neerstap.
const UP_RATIO = (1 - TARGET_CORRECT) / TARGET_CORRECT;

const FAST_RESPONSE_MS = 4000; // snel en goed geeft een iets grotere opstap
const FAST_BONUS = 1.3;

function clampEstimate(value: number): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, value));
}

// Vertaalt de continue schatting naar een discreet generatie-niveau (1..5).
export function levelForEstimate(estimate: number): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(estimate)));
}

// startEstimate maakt het mogelijk om een terugkerende gebruiker op het niveau
// van zijn vorige sessie te laten beginnen, in plaats van altijd in het midden.
export function createSession(
  category: Category,
  mode: Mode,
  startEstimate: number = INITIAL_ESTIMATE,
): SessionState {
  return {
    category,
    mode,
    estimate: clampEstimate(startEstimate),
    stepSize: INITIAL_STEP,
    lastDirection: null,
    answers: [],
    finished: false,
  };
}

export interface AnswerInput {
  item: Item;
  chosenIndex: number;
  responseMs: number;
}

// Verwerkt een antwoord: werkt de schatting, stap en richting bij, voegt het
// antwoord toe en bepaalt of de sessie klaar is. Pure functie: geeft een
// nieuwe SessionState terug.
export function applyAnswer(state: SessionState, input: AnswerInput): SessionState {
  const { item, chosenIndex, responseMs } = input;
  const correct = chosenIndex === item.correctIndex;
  const direction: 'up' | 'down' = correct ? 'up' : 'down';

  // Stap halveren bij een richtingsomkering.
  const reversal = state.lastDirection !== null && direction !== state.lastDirection;
  const nextStep = reversal ? Math.max(MIN_STEP, state.stepSize / 2) : state.stepSize;

  let delta: number;
  if (correct) {
    const fast = responseMs <= FAST_RESPONSE_MS;
    delta = nextStep * UP_RATIO * (fast ? FAST_BONUS : 1);
  } else {
    delta = -nextStep;
  }
  const newEstimate = clampEstimate(state.estimate + delta);

  const answer: Answer = {
    itemId: item.id,
    category: item.category,
    chosenIndex,
    correct,
    responseMs,
    levelAtTime: item.level,
    estimateAtTime: newEstimate,
  };

  const answers = [...state.answers, answer];
  const stable = nextStep <= MIN_STEP && answers.length >= MIN_ITEMS;
  const finished = answers.length >= MAX_ITEMS || stable;

  return {
    ...state,
    estimate: newEstimate,
    stepSize: nextStep,
    lastDirection: direction,
    answers,
    finished,
  };
}

// Het niveau waarop het volgende item gegenereerd moet worden.
export function nextLevel(state: SessionState): number {
  return levelForEstimate(state.estimate);
}

export interface SummaryMeta {
  id: string;
  completedAt: string;
  score: number;
  bestStreak: number;
}

// Vat een (afgeronde) sessie samen voor opslag en het eindrapport.
export function summarizeSession(state: SessionState, meta: SummaryMeta): SessionResult {
  const count = state.answers.length;
  const correctCount = state.answers.filter((a) => a.correct).length;
  const totalMs = state.answers.reduce((sum, a) => sum + a.responseMs, 0);
  const estimateTrail = [INITIAL_ESTIMATE, ...state.answers.map((a) => a.estimateAtTime)];
  return {
    id: meta.id,
    category: state.category,
    mode: state.mode,
    finalEstimate: state.estimate,
    percentCorrect: count === 0 ? 0 : Math.round((correctCount / count) * 100),
    averageResponseMs: count === 0 ? 0 : Math.round(totalMs / count),
    itemCount: count,
    score: meta.score,
    bestStreak: meta.bestStreak,
    estimateTrail,
    completedAt: meta.completedAt,
  };
}

// Beheert het verloop van een actieve oefensessie: genereert items op het
// gevraagde niveau, registreert antwoorden, houdt de spelscore bij, regelt
// feedback in oefenmodus, toont halverwege een "Wist je dat..."-feit en rondt
// de sessie af.

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  applyAnswer,
  createSession,
  nextLevel,
  summarizeSession,
  MAX_ITEMS,
} from '../engine/adaptive';
import { scoreAnswer } from '../engine/scoring';
import { generate } from '../generators';
import { makeId } from '../storage/store';
import { randomFact, type Fact } from '../data/facts';
import type { Category, Item, Mode, SessionResult, SessionState } from '../engine/types';

export interface Feedback {
  correct: boolean;
  chosenIndex: number;
  correctIndex: number;
  explanation: string;
  pointsEarned: number;
}

interface Params {
  category: Category;
  mode: Mode;
  onComplete: (result: SessionResult) => void;
}

// Halverwege de sessie verschijnt een motiverend feit.
const TIP_AFTER = Math.floor(MAX_ITEMS / 2);

export function useSession({ category, mode, onComplete }: Params) {
  const [session, setSession] = useState<SessionState>(() => createSession(category, mode));
  const [item, setItem] = useState<Item>(() => generate(category, nextLevel(createSession(category, mode)), 0));
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [tip, setTip] = useState<Fact | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const startTime = useRef<number>(performance.now());
  const bestStreak = useRef(0);
  const tipShown = useRef(false);
  const completed = useRef(false);

  const finish = useCallback(
    (finalState: SessionState, finalScore: number) => {
      if (completed.current) return;
      completed.current = true;
      const result = summarizeSession(finalState, {
        id: makeId('session'),
        completedAt: new Date().toISOString(),
        score: finalScore,
        bestStreak: bestStreak.current,
      });
      onComplete(result);
    },
    [onComplete],
  );

  const generateNext = useCallback(
    (state: SessionState) => {
      const next = generate(category, nextLevel(state), state.answers.length);
      setItem(next);
      startTime.current = performance.now();
    },
    [category],
  );

  // Bepaalt wat er na een afgehandeld antwoord gebeurt: afronden, een feit
  // tonen, of doorgaan naar de volgende vraag.
  const advance = useCallback(
    (state: SessionState, currentScore: number) => {
      if (state.finished) {
        finish(state, currentScore);
        return;
      }
      if (!tipShown.current && state.answers.length === TIP_AFTER) {
        tipShown.current = true;
        setTip(randomFact());
        return; // de volgende vraag komt na het wegklikken van het feit
      }
      generateNext(state);
    },
    [finish, generateNext],
  );

  const submitAnswer = useCallback(
    (chosenIndex: number) => {
      if (feedback || tip) return; // wacht op proceed of het wegklikken van een feit
      const responseMs = Math.round(performance.now() - startTime.current);
      const correct = chosenIndex === item.correctIndex;
      const nextState = applyAnswer(session, { item, chosenIndex, responseMs });

      const { points, streakAfter } = scoreAnswer({
        correct,
        level: item.level,
        responseMs,
        streakBefore: streak,
      });
      const newScore = score + points;
      bestStreak.current = Math.max(bestStreak.current, streakAfter);

      setSession(nextState);
      setScore(newScore);
      setStreak(streakAfter);

      if (mode === 'practice') {
        // Toon eerst feedback; doorgaan gebeurt pas bij proceed, zodat de
        // gebruiker de uitleg van de laatste vraag nog kan lezen.
        setFeedback({
          correct,
          chosenIndex,
          correctIndex: item.correctIndex,
          explanation: item.explanation,
          pointsEarned: points,
        });
        return;
      }

      advance(nextState, newScore);
    },
    [feedback, tip, session, item, mode, streak, score, advance],
  );

  // Oefenmodus: na het lezen van de feedback verder.
  const proceed = useCallback(() => {
    if (!feedback) return;
    setFeedback(null);
    advance(session, score);
  }, [feedback, session, score, advance]);

  // Het motiverende feit wegklikken en doorgaan.
  const dismissTip = useCallback(() => {
    if (!tip) return;
    setTip(null);
    generateNext(session);
  }, [tip, session, generateNext]);

  const itemNumber = useMemo(
    () => Math.min(session.answers.length + (feedback ? 0 : 1), MAX_ITEMS),
    [session.answers.length, feedback],
  );

  return {
    session,
    item,
    feedback,
    tip,
    score,
    streak,
    itemNumber,
    totalItems: MAX_ITEMS,
    submitAnswer,
    proceed,
    dismissTip,
    isLastQuestion: session.finished,
  };
}

// Beheert het verloop van een actieve oefensessie: genereert items op het
// gevraagde niveau, registreert antwoorden, houdt de spelscore bij, regelt
// feedback in oefenmodus, toont halverwege een "Wist je dat..."-feit en rondt
// de sessie af.

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  applyAnswer,
  createSession,
  levelForEstimate,
  nextLevel,
  summarizeSession,
  INITIAL_ESTIMATE,
  MAX_ITEMS,
} from '../engine/adaptive';
import { scoreAnswer } from '../engine/scoring';
import { NO_ANSWER, timeLimitMs } from '../engine/timing';
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
  hintUsed: boolean; // punten zijn dan gehalveerd
}

interface Params {
  category: Category;
  mode: Mode;
  startEstimate?: number;
  onComplete: (result: SessionResult) => void;
}

// Halverwege de sessie verschijnt een motiverend feit.
const TIP_AFTER = Math.floor(MAX_ITEMS / 2);

// Aantal tredes hulp: eerst de aanpak, daarna de eerste concrete denkstap.
export const HINT_STEPS = 2;

export function useSession({ category, mode, startEstimate = INITIAL_ESTIMATE, onComplete }: Params) {
  const [session, setSession] = useState<SessionState>(() => createSession(category, mode, startEstimate));
  const [item, setItem] = useState<Item>(() =>
    generate(category, nextLevel(createSession(category, mode, startEstimate)), 0),
  );
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [tip, setTip] = useState<Fact | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  // Testmodus: de tijd is om en de sessie wacht op een klik. Zonder deze pauze
  // verdwijnt de vraag zonder dat de gebruiker weet wat er gebeurde.
  const [timedOut, setTimedOut] = useState(false);
  // Hoeveel tredes hulp er voor het huidige item zijn opgevraagd: 0 = geen,
  // 1 = de aanpak, 2 = ook de eerste concrete denkstap.
  const [hintLevel, setHintLevel] = useState(0);

  const startTime = useRef<number>(performance.now());
  const bestStreak = useRef(0);
  const maxLevel = useRef(levelForEstimate(startEstimate));
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
      setHintLevel(0); // elke nieuwe vraag begint weer zonder hulp
      startTime.current = performance.now();
    },
    [category],
  );

  // Een trede hulp erbij. Meer dan twee tredes zijn er niet.
  const revealHint = useCallback(() => {
    if (feedback || tip) return;
    setHintLevel((current) => Math.min(HINT_STEPS, current + 1));
  }, [feedback, tip]);

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
      if (feedback || tip || timedOut) return; // wacht op een klik van de gebruiker
      const responseMs = Math.round(performance.now() - startTime.current);
      const correct = chosenIndex === item.correctIndex;
      const nextState = applyAnswer(session, { item, chosenIndex, responseMs });

      const { points, streakAfter } = scoreAnswer({
        correct,
        level: item.level,
        responseMs,
        streakBefore: streak,
        hintUsed: hintLevel > 0,
      });
      const newScore = score + points;
      bestStreak.current = Math.max(bestStreak.current, streakAfter);

      // Melding wanneer een hoger niveau dan tot nu toe wordt bereikt.
      const reachedLevel = levelForEstimate(nextState.estimate);
      if (reachedLevel > maxLevel.current) {
        maxLevel.current = reachedLevel;
        setLevelUp(reachedLevel);
      } else {
        setLevelUp(null);
      }

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
          hintUsed: hintLevel > 0,
        });
        return;
      }

      // Testmodus geeft geen feedback per vraag, maar een verlopen vraag is geen
      // feedback: dat is een gebeurtenis die je gemist zou hebben.
      if (chosenIndex === NO_ANSWER) {
        setTimedOut(true);
        return;
      }

      advance(nextState, newScore);
    },
    [feedback, tip, timedOut, session, item, mode, streak, score, hintLevel, advance],
  );

  // Oefenmodus: na het lezen van de feedback verder.
  const proceed = useCallback(() => {
    if (!feedback) return;
    setFeedback(null);
    advance(session, score);
  }, [feedback, session, score, advance]);

  // De tijd is om: telt als een fout antwoord. Alleen in testmodus, want daar
  // hangt de klok.
  const timeExpired = useCallback(() => {
    if (feedback || tip || timedOut) return;
    submitAnswer(NO_ANSWER);
  }, [feedback, tip, timedOut, submitAnswer]);

  // Na een verlopen vraag verder. Het antwoord is al verwerkt; hier wordt alleen
  // de pauze opgeheven.
  const proceedAfterTimeout = useCallback(() => {
    if (!timedOut) return;
    setTimedOut(false);
    advance(session, score);
  }, [timedOut, session, score, advance]);

  // De niveau-melding verdwijnt vanzelf; de pop-up meldt zich hier af.
  const dismissLevelUp = useCallback(() => setLevelUp(null), []);

  // Het motiverende feit wegklikken en doorgaan.
  const dismissTip = useCallback(() => {
    if (!tip) return;
    setTip(null);
    generateNext(session);
  }, [tip, session, generateNext]);

  // Het antwoord is al geteld zodra er feedback staat of de tijd om is, maar de
  // gebruiker kijkt dan nog naar diezelfde vraag. De teller mag dus pas
  // doorlopen als hij verdergaat.
  const itemNumber = useMemo(
    () => Math.min(session.answers.length + (feedback || timedOut ? 0 : 1), MAX_ITEMS),
    [session.answers.length, feedback, timedOut],
  );

  return {
    session,
    item,
    feedback,
    tip,
    score,
    streak,
    levelUp,
    itemNumber,
    totalItems: MAX_ITEMS,
    hintLevel,
    hintsLeft: HINT_STEPS - hintLevel,
    revealHint,
    submitAnswer,
    proceed,
    dismissTip,
    dismissLevelUp,
    timeExpired,
    timedOut,
    proceedAfterTimeout,
    // Alleen in testmodus hangt er een klok; in oefenmodus is dit null.
    timeLimit: mode === 'test' ? timeLimitMs(item) : null,
    isLastQuestion: session.finished,
  };
}

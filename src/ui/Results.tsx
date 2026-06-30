// Eindrapport: spelscore en high score, niveau-schatting, percentage goed,
// gemiddelde tijd, het niveauverloop, motiverende feedback met een vergelijking
// met vorige sessies, en een "Wist je dat..."-feit.

import { useMemo } from 'react';
import { BarChart3, Home, Trophy } from 'lucide-react';
import type { Profile, SessionResult } from '../engine/types';
import { categoryLabels } from '../generators';
import { bestScoreForCategory, compareToPrevious, formatDateTime } from '../storage/history';
import { randomFact } from '../data/facts';
import { LevelChart } from './LevelChart';

interface Props {
  result: SessionResult;
  profile: Profile;
  onRetry: () => void;
  onHome: () => void;
  onShowProgress: () => void;
  onShowLeaderboard: () => void;
}

// Vertaalt een niveau-schatting naar een herkenbare omschrijving.
function describeLevel(estimate: number): string {
  if (estimate < 2.0) return 'een instappend niveau';
  if (estimate < 3.0) return 'rond mbo 3-4 niveau';
  if (estimate < 4.0) return 'tussen mbo-4 en hbo';
  return 'rond hbo-niveau';
}

function trendText(profile: Profile, result: SessionResult): string {
  const { trend, delta, previousEstimate } = compareToPrevious(profile, result);
  if (trend === 'first') return 'Dit is je eerste sessie in deze categorie. Goede basis om vanaf te groeien.';
  const diff = Math.abs(delta).toFixed(1);
  if (trend === 'up') return `Vooruitgang: +${diff} niveau ten opzichte van je vorige sessie (${previousEstimate?.toFixed(1)}).`;
  if (trend === 'down') return `Iets lager dan je vorige sessie (-${diff} niveau). Een mindere dag hoort erbij.`;
  return 'Stabiel ten opzichte van je vorige sessie. Je niveau is consistent.';
}

export function Results({ result, profile, onRetry, onHome, onShowProgress, onShowLeaderboard }: Props) {
  const seconds = (result.averageResponseMs / 1000).toFixed(1);

  // Het vorige record in deze categorie (zonder de zojuist afgeronde sessie).
  const previousBest = bestScoreForCategory(profile, result.category, result.id);
  const isNewRecord = result.score > previousBest && previousBest > 0;
  const highScore = Math.max(result.score, previousBest);

  // Eenmaal een feit kiezen bij het tonen van dit scherm.
  const fact = useMemo(() => randomFact(), []);

  return (
    <section className="screen">
      <h1>Resultaat: {categoryLabels[result.category]}</h1>
      <p className="muted">{formatDateTime(result.completedAt)}</p>

      {isNewRecord && <div className="record-badge">Nieuw record! 🎉</div>}

      <div className="score-summary">
        <div className="score-main">
          <span className="score-main-value">{result.score}</span>
          <span className="stat-label">punten</span>
        </div>
        <div className="score-side">
          <p className="muted">High score: <strong>{highScore}</strong></p>
          <p className="muted">Langste reeks: <strong>{result.bestStreak}x</strong> goed achter elkaar</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="stat-value">{result.finalEstimate.toFixed(1)}</span>
          <span className="stat-label">niveau (van 5)</span>
        </div>
        <div className="stat">
          <span className="stat-value">{result.percentCorrect}%</span>
          <span className="stat-label">goed</span>
        </div>
        <div className="stat">
          <span className="stat-value">{seconds}s</span>
          <span className="stat-label">gem. tijd per vraag</span>
        </div>
      </div>

      <p className="feedback-line">
        Je presteert <strong>{describeLevel(result.finalEstimate)}</strong> in deze categorie.
      </p>
      <p className="feedback-line">{trendText(profile, result)}</p>

      <LevelChart values={result.estimateTrail} label="Niveauverloop tijdens deze sessie" />

      <div className="fact-card">
        <p className="fact-title">{fact.title}</p>
        <p>{fact.body}</p>
      </div>

      <div className="footer-actions">
        <button className="primary" onClick={onRetry}>Nog een keer oefenen</button>
        <button className="btn" onClick={onShowLeaderboard}>
          <Trophy size={18} /> Ranglijst
        </button>
        <button className="btn" onClick={onShowProgress}>
          <BarChart3 size={18} /> Voortgang
        </button>
        <button className="btn" onClick={onHome}>
          <Home size={18} /> Start
        </button>
      </div>
    </section>
  );
}

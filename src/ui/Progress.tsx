// Voortgangsscherm: per categorie het niveauverloop, geplot op de dagen van een
// 7-daags venster dat je terug en vooruit kunt schuiven.

import { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Category, Profile } from '../engine/types';
import { categoryLabels } from '../generators';
import { bestScoreForCategory, formatDateTime, resultsForCategory } from '../storage/history';
import { addDays, pointsInWindow, startOfDay } from '../engine/dateWindow';
import { DailyLevelChart } from './DailyLevelChart';

interface Props {
  profile: Profile;
  onBack: () => void;
}

const trackedCategories: Category[] = ['numeric', 'letters', 'verbal', 'mixed'];
const WINDOW_DAYS = 7;

function dayMonth(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function Progress({ profile, onBack }: Props) {
  // Vandaag eenmalig vastleggen; offset in dagen bepaalt het venster.
  const [today] = useState(() => startOfDay(new Date()));
  const [offset, setOffset] = useState(0);

  const windowStart = addDays(today, -(WINDOW_DAYS - 1) - offset);
  const windowEnd = addDays(windowStart, WINDOW_DAYS - 1);

  const sections = trackedCategories
    .map((category) => ({ category, results: resultsForCategory(profile, category) }))
    .filter((s) => s.results.length > 0);

  return (
    <section className="screen">
      <header className="screen-header">
        <h1>Voortgang van {profile.name}</h1>
        <button className="btn" onClick={onBack}>
          <ArrowLeft size={18} /> Terug
        </button>
      </header>

      {sections.length === 0 ? (
        <p className="muted">Nog geen afgeronde sessies. Oefen eerst een categorie om je voortgang te zien.</p>
      ) : (
        <>
          <div className="window-nav">
            <button className="icon-button" onClick={() => setOffset(offset + WINDOW_DAYS)} aria-label="Eerdere week" title="Eerdere week">
              <ChevronLeft size={18} />
            </button>
            <span className="window-range">{dayMonth(windowStart)} - {dayMonth(windowEnd)}</span>
            <button
              className="icon-button"
              onClick={() => setOffset(Math.max(0, offset - WINDOW_DAYS))}
              disabled={offset === 0}
              aria-label="Latere week"
              title="Latere week"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {sections.map(({ category, results }) => {
            const estimates = results.map((r) => r.finalEstimate);
            const best = Math.max(...estimates);
            const latest = estimates[estimates.length - 1];
            const highScore = bestScoreForCategory(profile, category);
            const lastResult = results[results.length - 1];
            const points = pointsInWindow(results, windowStart, WINDOW_DAYS);
            return (
              <article key={category} className="progress-section">
                <h2>{categoryLabels[category]}</h2>
                <p className="muted">
                  {results.length} sessies · laatste niveau {latest.toFixed(1)} · beste niveau {best.toFixed(1)} · high score {highScore}
                </p>
                <p className="muted">Laatst geoefend: {formatDateTime(lastResult.completedAt)}</p>
                {points.length > 0 ? (
                  <DailyLevelChart points={points} windowStart={windowStart} days={WINDOW_DAYS} />
                ) : (
                  <p className="muted">Geen sessies in deze periode.</p>
                )}
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}

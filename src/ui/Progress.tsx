// Voortgangsscherm: per categorie het verloop van de eind-niveauschatting over
// de sessies heen, met een korte samenvatting (beste niveau, aantal sessies).

import { ArrowLeft } from 'lucide-react';
import type { Category, Profile } from '../engine/types';
import { categoryLabels } from '../generators';
import { bestScoreForCategory, formatDateTime, resultsForCategory } from '../storage/history';
import { LevelChart } from './LevelChart';

interface Props {
  profile: Profile;
  onBack: () => void;
}

const trackedCategories: Category[] = ['numeric', 'letters', 'verbal', 'mixed'];

export function Progress({ profile, onBack }: Props) {
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

      {sections.length === 0 && (
        <p className="muted">Nog geen afgeronde sessies. Oefen eerst een categorie om je voortgang te zien.</p>
      )}

      {sections.map(({ category, results }) => {
        const estimates = results.map((r) => r.finalEstimate);
        const best = Math.max(...estimates);
        const latest = estimates[estimates.length - 1];
        const highScore = bestScoreForCategory(profile, category);
        const lastResult = results[results.length - 1];
        return (
          <article key={category} className="progress-section">
            <h2>{categoryLabels[category]}</h2>
            <p className="muted">
              {results.length} sessies · laatste niveau {latest.toFixed(1)} · beste niveau {best.toFixed(1)} · high score {highScore}
            </p>
            <p className="muted">Laatst geoefend: {formatDateTime(lastResult.completedAt)}</p>
            <LevelChart values={estimates} label="Eindniveau per sessie" />
          </article>
        );
      })}
    </section>
  );
}

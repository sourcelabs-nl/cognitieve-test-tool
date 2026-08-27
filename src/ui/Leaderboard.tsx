// Leaderboard: top 10 ranglijst over alle profielen in deze browser, te
// filteren per categorie of over alle categorieen.

import { useMemo, useState } from 'react';
import { ArrowLeft, Medal } from 'lucide-react';
import type { Category } from '../engine/types';
import { categoryLabels } from '../generators';
import { getLeaderboard, type LeaderboardFilter } from '../storage/leaderboard';
import { Avatar } from './avatars';

interface Props {
  highlightName?: string; // markeert het huidige profiel in de lijst
  onBack: () => void;
}

const filters: { value: LeaderboardFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'numeric', label: categoryLabels.numeric },
  { value: 'letters', label: categoryLabels.letters },
  { value: 'verbal', label: categoryLabels.verbal },
  { value: 'mixed', label: categoryLabels.mixed },
];

// De eerste drie plaatsen krijgen een medaille. Bewust een lucide-icoon en geen
// emoji (zie de conventies in CLAUDE.md): emoji zien er op elk toestel anders uit
// en verschijnen op sommige als een leeg vierkantje.
const MEDAL_PLACES = 3;

export function Leaderboard({ highlightName, onBack }: Props) {
  const [filter, setFilter] = useState<LeaderboardFilter>('all');
  const entries = useMemo(() => getLeaderboard(filter), [filter]);

  return (
    <section className="screen">
      <header className="screen-header">
        <h1>Ranglijst</h1>
        <button className="btn" onClick={onBack}>
          <ArrowLeft size={18} /> Terug
        </button>
      </header>

      <div className="filter-row">
        {filters.map((f) => (
          <button
            key={f.value}
            className={`filter-chip ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <p className="muted">Nog geen scores in deze categorie. Speel een sessie om op de ranglijst te komen.</p>
      ) : (
        <ol className="leaderboard">
          {entries.map((e, i) => (
            <li key={`${e.profileName}-${i}`} className={e.profileName === highlightName ? 'me' : ''}>
              <span className={`rank${i < MEDAL_PLACES ? ` rank-${i + 1}` : ''}`}>
                {i < MEDAL_PLACES ? (
                  <Medal size={20} aria-label={`${i + 1}e plaats`} />
                ) : (
                  `${i + 1}.`
                )}
              </span>
              <Avatar id={e.avatar} size={32} />
              <span className="lb-name">{e.profileName}</span>
              {filter === 'all' && <span className="muted lb-cat">{categoryLabels[e.category as Category]}</span>}
              <span className="lb-score">{e.score}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

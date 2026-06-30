// Historie: afgeronde sessies opslaan en uitlezen per profiel, plus een
// eenvoudige trendberekening voor de voortgangsfeedback.

import type { Category, Profile, SessionResult } from '../engine/types';
import { INITIAL_ESTIMATE } from '../engine/adaptive';
import { loadStore, saveStore } from './store';

// Voegt een sessieresultaat toe aan een profiel. Geeft het bijgewerkte
// profiel terug, of undefined als het profiel niet bestaat.
export function addResult(profileId: string, result: SessionResult): Profile | undefined {
  const store = loadStore();
  const profile = store.profiles.find((p) => p.id === profileId);
  if (!profile) return undefined;
  profile.history.push(result);
  saveStore(store);
  return profile;
}

// Startniveau voor een nieuwe sessie: het eindniveau van de vorige sessie in
// deze categorie, zodat een terugkerende gebruiker op niveau begint. Zonder
// historie starten we in het midden.
export function startEstimateForCategory(profile: Profile, category: Category): number {
  const results = resultsForCategory(profile, category);
  return results.length > 0 ? results[results.length - 1].finalEstimate : INITIAL_ESTIMATE;
}

export function resultsForCategory(profile: Profile, category: Category): SessionResult[] {
  return profile.history
    .filter((r) => r.category === category)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

// Hoogste score in een categorie, eventueel met uitsluiting van een sessie
// (om een nieuw resultaat met het vorige record te kunnen vergelijken).
export function bestScoreForCategory(profile: Profile, category: Category, excludeId?: string): number {
  const scores = profile.history
    .filter((r) => r.category === category && r.id !== excludeId)
    .map((r) => r.score);
  return scores.length === 0 ? 0 : Math.max(...scores);
}

// Datum en tijd in een leesbaar Nederlands formaat.
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export type Trend = 'up' | 'flat' | 'down' | 'first';

export interface ProgressComparison {
  trend: Trend;
  delta: number; // verschil in eind-niveauschatting t.o.v. de vorige sessie
  previousEstimate: number | null;
}

// Vergelijkt het nieuwste resultaat met de voorgaande sessie in dezelfde
// categorie. Een verschil kleiner dan 0.25 niveau geldt als stabiel.
export function compareToPrevious(profile: Profile, latest: SessionResult): ProgressComparison {
  const sameCategory = resultsForCategory(profile, latest.category).filter((r) => r.id !== latest.id);
  const previous = sameCategory[sameCategory.length - 1];
  if (!previous) return { trend: 'first', delta: 0, previousEstimate: null };

  const delta = latest.finalEstimate - previous.finalEstimate;
  let trend: Trend = 'flat';
  if (delta > 0.25) trend = 'up';
  else if (delta < -0.25) trend = 'down';
  return { trend, delta, previousEstimate: previous.finalEstimate };
}

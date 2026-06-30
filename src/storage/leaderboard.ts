// Leaderboard: een ranglijst over alle profielen in deze browser, op basis van
// hun beste sessiescore. Te filteren per categorie of over alle categorieen.

import type { Category, Profile } from '../engine/types';
import { listProfiles } from './profiles';

export interface LeaderboardEntry {
  profileName: string;
  avatar?: string;
  score: number;
  category: Category;
  finalEstimate: number;
  completedAt: string;
}

export type LeaderboardFilter = Category | 'all';

// Pure ranglijst-berekening: per profiel de beste sessie binnen het filter,
// gesorteerd op score. Apart van de opslag zodat dit getest kan worden.
export function rankProfiles(
  profiles: Profile[],
  filter: LeaderboardFilter,
  limit = 10,
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  for (const profile of profiles) {
    const sessions = profile.history.filter((r) => filter === 'all' || r.category === filter);
    if (sessions.length === 0) continue;
    const best = sessions.reduce((a, b) => (b.score > a.score ? b : a));
    entries.push({
      profileName: profile.name,
      avatar: profile.avatar,
      score: best.score,
      category: best.category,
      finalEstimate: best.finalEstimate,
      completedAt: best.completedAt,
    });
  }
  return entries.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function getLeaderboard(filter: LeaderboardFilter, limit = 10): LeaderboardEntry[] {
  return rankProfiles(listProfiles(), filter, limit);
}

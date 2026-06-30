import { describe, it, expect } from 'vitest';
import { rankProfiles } from '../storage/leaderboard';
import type { Profile, SessionResult } from '../engine/types';

function result(category: SessionResult['category'], score: number): SessionResult {
  return {
    id: `s-${category}-${score}`,
    category,
    mode: 'test',
    finalEstimate: 3,
    percentCorrect: 70,
    averageResponseMs: 5000,
    itemCount: 15,
    score,
    bestStreak: 4,
    estimateTrail: [2.5, 3],
    completedAt: '2026-06-30T10:00:00.000Z',
  };
}

const profiles: Profile[] = [
  { id: 'a', name: 'Anna', createdAt: '', history: [result('numeric', 800), result('numeric', 1200), result('verbal', 500)] },
  { id: 'b', name: 'Bram', createdAt: '', history: [result('numeric', 1000), result('letters', 1500)] },
  { id: 'c', name: 'Cas', createdAt: '', history: [] },
];

describe('leaderboard', () => {
  it('rangschikt profielen op hun beste score per categorie', () => {
    const board = rankProfiles(profiles, 'numeric');
    expect(board.map((e) => e.profileName)).toEqual(['Anna', 'Bram']);
    expect(board[0].score).toBe(1200); // Anna's beste numerieke sessie
  });

  it('over alle categorieen telt de hoogste score van een profiel', () => {
    const board = rankProfiles(profiles, 'all');
    expect(board[0].profileName).toBe('Bram'); // 1500 (letters)
    expect(board[0].score).toBe(1500);
  });

  it('profielen zonder passende sessies komen niet in de lijst', () => {
    const board = rankProfiles(profiles, 'verbal');
    expect(board.map((e) => e.profileName)).toEqual(['Anna']);
  });

  it('respecteert de limiet', () => {
    expect(rankProfiles(profiles, 'all', 1)).toHaveLength(1);
  });
});

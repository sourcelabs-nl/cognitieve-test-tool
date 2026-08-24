import { describe, it, expect } from 'vitest';
import { assessProgress } from '../engine/assessment';
import type { Category, Profile, SessionResult } from '../engine/types';

const NOW = new Date(2026, 0, 20);

interface SessionInput {
  category: Category;
  estimate: number;
  daysAgo: number;
  percentCorrect?: number;
  seconds?: number;
  bestStreak?: number;
}

function session(index: number, input: SessionInput): SessionResult {
  const date = new Date(2026, 0, 20 - input.daysAgo, 12, 0, 0);
  return {
    id: `s${index}`,
    category: input.category,
    mode: 'practice',
    finalEstimate: input.estimate,
    percentCorrect: input.percentCorrect ?? 72,
    averageResponseMs: (input.seconds ?? 15) * 1000,
    itemCount: 15,
    score: 1000,
    bestStreak: input.bestStreak ?? 4,
    estimateTrail: [2.5, input.estimate],
    completedAt: date.toISOString(),
  };
}

function profileWith(sessions: SessionInput[]): Profile {
  return {
    id: 'p1',
    name: 'Test',
    createdAt: new Date(2025, 11, 1).toISOString(),
    history: sessions.map((input, i) => session(i, input)),
  };
}

describe('beoordeling van de voortgang', () => {
  it('zegt zonder sessies dat er nog niets te beoordelen valt', () => {
    const assessment = assessProgress(profileWith([]), NOW);
    expect(assessment.hasData).toBe(false);
    expect(assessment.strengths).toHaveLength(0);
    expect(assessment.improvements).toHaveLength(0);
    expect(assessment.nextStep.length).toBeGreaterThan(0);
  });

  it('herkent vooruitgang als de recente sessies hoger liggen', () => {
    const estimates = [2.0, 2.2, 2.4, 3.6, 3.9, 4.2];
    const assessment = assessProgress(
      profileWith(
        estimates.map((estimate, i) => ({
          category: 'numeric' as Category,
          estimate,
          daysAgo: 12 - i * 2,
        })),
      ),
      NOW,
    );
    expect(assessment.hasData).toBe(true);
    expect(assessment.strengths.join(' ')).toContain('vooruit');
    expect(assessment.strengths.join(' ')).toContain('Cijferpatronen');
    expect(assessment.headline).toContain('6 sessies');
  });

  it('meldt een lage score als verbeterpunt', () => {
    const assessment = assessProgress(
      profileWith([
        { category: 'verbal', estimate: 2.0, daysAgo: 3, percentCorrect: 40 },
        { category: 'verbal', estimate: 2.1, daysAgo: 2, percentCorrect: 45 },
      ]),
      NOW,
    );
    expect(assessment.improvements.join(' ')).toContain('43%'); // gemiddelde van 40 en 45
    expect(assessment.improvements.join(' ')).toContain('hulpknop');
  });

  it('noemt de sterkste en de zwakste categorie als er meerdere zijn', () => {
    const assessment = assessProgress(
      profileWith([
        { category: 'numeric', estimate: 4.6, daysAgo: 2 },
        { category: 'verbal', estimate: 2.4, daysAgo: 1 },
      ]),
      NOW,
    );
    expect(assessment.strengths[0]).toContain('Cijferpatronen');
    expect(assessment.improvements[0]).toContain('Woordrelaties');
  });

  it('wijst op categorieen die nog niet geoefend zijn', () => {
    const assessment = assessProgress(
      profileWith([{ category: 'numeric', estimate: 3.0, daysAgo: 1 }]),
      NOW,
    );
    expect(assessment.improvements.join(' ')).toContain('Letterpatronen');
    expect(assessment.nextStep).toContain('Letterpatronen');
  });

  it('signaleert een categorie die lang niet geoefend is', () => {
    const assessment = assessProgress(
      profileWith([
        { category: 'mixed', estimate: 3.0, daysAgo: 30 },
        { category: 'mixed', estimate: 3.1, daysAgo: 29 },
      ]),
      NOW,
    );
    expect(assessment.improvements.join(' ')).toContain('29 dagen niet geoefend');
  });

  it('waarschuwt dat een enkele sessie nog geen beeld geeft', () => {
    const assessment = assessProgress(
      profileWith([{ category: 'letters', estimate: 3.4, daysAgo: 0 }]),
      NOW,
    );
    expect(assessment.headline).toContain('eerste indruk');
  });
});

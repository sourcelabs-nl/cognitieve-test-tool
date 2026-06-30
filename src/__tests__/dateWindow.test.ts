import { describe, it, expect } from 'vitest';
import { addDays, dayIndex, pointsInWindow, startOfDay } from '../engine/dateWindow';

function iso(y: number, m: number, d: number): string {
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

describe('dateWindow', () => {
  it('dayIndex telt hele dagen vanaf het venster', () => {
    const start = new Date(2026, 5, 1);
    expect(dayIndex(new Date(2026, 5, 1, 23), start)).toBe(0);
    expect(dayIndex(new Date(2026, 5, 4), start)).toBe(3);
    expect(dayIndex(new Date(2026, 4, 30), start)).toBe(-2);
  });

  it('addDays en startOfDay werken op dagniveau', () => {
    const d = startOfDay(new Date(2026, 5, 30, 15, 30));
    expect(d.getHours()).toBe(0);
    expect(addDays(d, 1).getDate()).toBe(1);
    expect(addDays(d, 1).getMonth()).toBe(6); // juli
  });

  it('pointsInWindow houdt alleen sessies binnen het venster en sorteert op dag', () => {
    const windowStart = new Date(2026, 5, 1);
    const sessions = [
      { completedAt: iso(2026, 6, 3), finalEstimate: 3.2 },
      { completedAt: iso(2026, 6, 1), finalEstimate: 2.5 },
      { completedAt: iso(2026, 6, 7), finalEstimate: 4.0 }, // dag 6, nog binnen
      { completedAt: iso(2026, 6, 8), finalEstimate: 4.5 }, // dag 7, buiten
      { completedAt: iso(2026, 5, 28), finalEstimate: 1.0 }, // voor het venster
    ];
    const points = pointsInWindow(sessions, windowStart, 7);
    expect(points.map((p) => p.dayIndex)).toEqual([0, 2, 6]);
    expect(points[0].value).toBe(2.5);
  });
});

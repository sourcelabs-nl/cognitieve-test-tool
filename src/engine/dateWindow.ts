// Datum-hulpfuncties voor het 7-daagse schuifvenster in de voortgangsgrafiek.
// Puur en testbaar; geen afhankelijkheid van de huidige tijd.

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// Aantal hele dagen tussen twee data (date - windowStart), op dagniveau.
export function dayIndex(date: Date, windowStart: Date): number {
  const ms = startOfDay(date).getTime() - startOfDay(windowStart).getTime();
  return Math.round(ms / 86_400_000);
}

export interface DayPoint {
  dayIndex: number; // 0..days-1 binnen het venster
  value: number; // niveau-schatting
  iso: string; // originele datum
}

// Zet sessies om naar punten binnen het venster [windowStart, windowStart+days).
export function pointsInWindow(
  sessions: { completedAt: string; finalEstimate: number }[],
  windowStart: Date,
  days = 7,
): DayPoint[] {
  return sessions
    .map((s) => ({
      dayIndex: dayIndex(new Date(s.completedAt), windowStart),
      value: s.finalEstimate,
      iso: s.completedAt,
    }))
    .filter((p) => p.dayIndex >= 0 && p.dayIndex < days)
    .sort((a, b) => a.dayIndex - b.dayIndex);
}

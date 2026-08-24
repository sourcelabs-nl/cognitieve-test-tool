// Beoordeling van de voortgang: leidt uit de opgeslagen sessies af hoe de
// gebruiker het doet, wat zijn sterke punten zijn en waar winst te halen valt.
//
// De analyse gebruikt alleen wat er per sessie is bewaard (eindschatting,
// percentage goed, gemiddelde responstijd, langste reeks, datum). Er gaat geen
// data de deur uit: alles wordt lokaal berekend.
//
// De regels zijn bewust conservatief. Met twee sessies is er nog geen trend, en
// een verschil van een tiende niveau is ruis; daarom gelden er drempels
// voordat iets een sterk punt of een verbeterpunt heet.

import { categoryLabels } from '../generators';
import { dayIndex } from './dateWindow';
import { levelLabel } from './levels';
import { MAX_LEVEL, type Category, type Profile, type SessionResult } from './types';

// Zoveel recente sessies vormen het beeld van "hoe je het nu doet".
const RECENT_SESSIONS = 3;
// Kleiner verschil in niveau dan dit is ruis, geen trend.
const TREND_THRESHOLD = 0.3;
// Vanaf zoveel sessies in een categorie durven we iets over een trend te zeggen.
const MIN_SESSIONS_FOR_TREND = 4;
const HIGH_ACCURACY = 80; // procent goed
const LOW_ACCURACY = 60;
const FAST_SECONDS = 10; // gemiddelde tijd per vraag
const SLOW_SECONDS = 25;
const LONG_STREAK = 8;
const STALE_DAYS = 7; // zo lang niet geoefend valt op
const ACTIVE_WINDOW_DAYS = 14;
const REGULAR_DAYS = 4; // actieve dagen binnen dat venster
// Meer dan dit aantal punten leest niemand meer op een telefoon.
const MAX_POINTS = 4;

export interface CategoryStats {
  category: Category;
  label: string;
  sessions: number;
  latest: number; // eindschatting van de laatste sessie
  best: number;
  recentAverage: number; // gemiddelde eindschatting van de laatste sessies
  delta: number; // recent gemiddelde min het gemiddelde daarvoor
  percentCorrect: number; // gemiddeld over de recente sessies
  averageSeconds: number; // gemiddeld over de recente sessies
  bestStreak: number;
  daysSinceLast: number;
}

export interface Assessment {
  hasData: boolean;
  headline: string;
  stats: CategoryStats[]; // alleen categorieen waarin daadwerkelijk geoefend is
  strengths: string[];
  improvements: string[];
  nextStep: string;
}

const ALL_CATEGORIES: Category[] = ['numeric', 'letters', 'verbal', 'mixed'];

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round1(value: number): string {
  return value.toFixed(1);
}

// Nederlandse opsomming: "A", "A en B", "A, B en C".
function listOf(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

function sortedByDate(results: SessionResult[]): SessionResult[] {
  return [...results].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

function statsFor(category: Category, results: SessionResult[], now: Date): CategoryStats {
  const sorted = sortedByDate(results);
  const recent = sorted.slice(-RECENT_SESSIONS);
  const earlier = sorted.slice(0, -RECENT_SESSIONS).slice(-RECENT_SESSIONS);
  const estimates = sorted.map((r) => r.finalEstimate);
  const recentAverage = average(recent.map((r) => r.finalEstimate));
  return {
    category,
    label: categoryLabels[category],
    sessions: sorted.length,
    latest: estimates[estimates.length - 1],
    best: Math.max(...estimates),
    recentAverage,
    delta: earlier.length === 0 ? 0 : recentAverage - average(earlier.map((r) => r.finalEstimate)),
    percentCorrect: Math.round(average(recent.map((r) => r.percentCorrect))),
    averageSeconds: Math.round(average(recent.map((r) => r.averageResponseMs)) / 1000),
    bestStreak: Math.max(...sorted.map((r) => r.bestStreak)),
    daysSinceLast: dayIndex(now, new Date(sorted[sorted.length - 1].completedAt)),
  };
}

// Aantal verschillende dagen waarop in het venster geoefend is.
function activeDays(history: SessionResult[], now: Date): number {
  const days = history
    .map((r) => dayIndex(now, new Date(r.completedAt)))
    .filter((d) => d >= 0 && d < ACTIVE_WINDOW_DAYS);
  return new Set(days).size;
}

function headlineFor(stats: CategoryStats[], sessions: number): string {
  const overall = average(stats.map((s) => s.latest));
  const trend = average(stats.map((s) => s.delta));
  const trendWord =
    trend > TREND_THRESHOLD
      ? 'De lijn wijst omhoog.'
      : trend < -TREND_THRESHOLD
        ? 'De lijn wijst op dit moment omlaag.'
        : 'Je zit stabiel op je eigen niveau.';
  const reliability =
    sessions < MIN_SESSIONS_FOR_TREND
      ? ` Let op: met ${sessions} ${sessions === 1 ? 'sessie' : 'sessies'} is dit nog een eerste indruk.`
      : '';
  return `Over ${sessions} ${sessions === 1 ? 'sessie' : 'sessies'} in ${stats.length} ${
    stats.length === 1 ? 'categorie' : 'categorieen'
  } sta je gemiddeld rond oefenniveau ${round1(overall)} (indicatie: ${levelLabel(overall)}). ${trendWord}${reliability}`;
}

function collectStrengths(stats: CategoryStats[], history: SessionResult[], now: Date): string[] {
  const found: string[] = [];
  const strongest = [...stats].sort((a, b) => b.latest - a.latest)[0];
  const weakest = [...stats].sort((a, b) => a.latest - b.latest)[0];

  if (stats.length > 1 && strongest.latest - weakest.latest >= TREND_THRESHOLD) {
    found.push(
      `${strongest.label} is je sterkste categorie: je staat daar op niveau ${round1(strongest.latest)} (indicatie: ${levelLabel(strongest.latest)}).`,
    );
  } else if (stats.length === 1) {
    found.push(
      `In ${strongest.label} sta je op niveau ${round1(strongest.latest)} (indicatie: ${levelLabel(strongest.latest)}).`,
    );
  }

  for (const s of stats) {
    if (s.sessions >= MIN_SESSIONS_FOR_TREND && s.delta >= TREND_THRESHOLD) {
      found.push(
        `Je gaat vooruit in ${s.label}: je recente sessies liggen ${round1(s.delta)} niveau hoger dan de sessies daarvoor.`,
      );
    }
  }

  for (const s of stats) {
    if (s.best >= MAX_LEVEL - 0.5) {
      found.push(`Je hebt in ${s.label} de bovenkant van de schaal aangetikt (niveau ${round1(s.best)}).`);
    }
  }

  for (const s of stats) {
    if (s.percentCorrect >= HIGH_ACCURACY) {
      found.push(
        `In ${s.label} heb je gemiddeld ${s.percentCorrect}% goed. Je maakt weinig fouten op je eigen niveau.`,
      );
    }
    if (s.averageSeconds <= FAST_SECONDS && s.percentCorrect >= LOW_ACCURACY) {
      found.push(
        `In ${s.label} werk je vlot: gemiddeld ${s.averageSeconds} seconden per vraag, met ${s.percentCorrect}% goed.`,
      );
    }
  }

  const streak = [...stats].sort((a, b) => b.bestStreak - a.bestStreak)[0];
  if (streak.bestStreak >= LONG_STREAK) {
    found.push(
      `Je langste reeks is ${streak.bestStreak} goede antwoorden achter elkaar (${streak.label}); je concentratie houdt goed stand.`,
    );
  }

  const days = activeDays(history, now);
  if (days >= REGULAR_DAYS) {
    found.push(`Je oefent regelmatig: ${days} verschillende dagen in de afgelopen twee weken.`);
  }

  return found.slice(0, MAX_POINTS);
}

function collectImprovements(stats: CategoryStats[]): string[] {
  const found: string[] = [];
  const strongest = [...stats].sort((a, b) => b.latest - a.latest)[0];
  const weakest = [...stats].sort((a, b) => a.latest - b.latest)[0];

  if (stats.length > 1 && strongest.latest - weakest.latest >= TREND_THRESHOLD) {
    found.push(
      `${weakest.label} blijft achter: niveau ${round1(weakest.latest)} tegenover ${round1(strongest.latest)} in ${strongest.label}. Daar valt de meeste winst te halen.`,
    );
  }

  for (const s of stats) {
    if (s.percentCorrect < LOW_ACCURACY) {
      found.push(
        `In ${s.label} heb je gemiddeld maar ${s.percentCorrect}% goed. Neem meer tijd per vraag en gebruik in de oefenmodus de hulpknop voordat je gokt.`,
      );
    }
  }

  for (const s of stats) {
    if (s.sessions >= MIN_SESSIONS_FOR_TREND && s.delta <= -TREND_THRESHOLD) {
      found.push(
        `In ${s.label} zak je iets: je recente sessies liggen ${round1(-s.delta)} niveau lager dan daarvoor.`,
      );
    } else if (s.sessions >= MIN_SESSIONS_FOR_TREND && Math.abs(s.delta) < TREND_THRESHOLD) {
      found.push(
        `In ${s.label} blijf je al ${s.sessions} sessies rond niveau ${round1(s.recentAverage)} hangen. Probeer de moeilijkere vragen wat langer vast te houden voordat je kiest.`,
      );
    }
  }

  for (const s of stats) {
    if (s.averageSeconds >= SLOW_SECONDS) {
      found.push(
        `In ${s.label} doe je gemiddeld ${s.averageSeconds} seconden over een vraag. Zie je het patroon niet binnen een halve minuut, kies dan bewust en ga door.`,
      );
    }
  }

  const untouched = ALL_CATEGORIES.filter((c) => !stats.some((s) => s.category === c));
  if (untouched.length > 0) {
    found.push(
      `Je hebt ${listOf(untouched.map((c) => categoryLabels[c]))} nog niet geoefend. Een categorie die je vermijdt is meestal precies de categorie waar je het meest kunt winnen.`,
    );
  }

  const stale = [...stats].sort((a, b) => b.daysSinceLast - a.daysSinceLast)[0];
  if (stale.daysSinceLast >= STALE_DAYS) {
    found.push(
      `${stale.label} heb je ${stale.daysSinceLast} dagen niet geoefend. Kort en vaak werkt beter dan lang en zelden.`,
    );
  }

  const thin = stats.filter((s) => s.sessions < MIN_SESSIONS_FOR_TREND);
  if (thin.length > 0 && found.length < MAX_POINTS) {
    found.push(
      `Van ${listOf(thin.map((s) => s.label))} zijn er nog te weinig sessies om een betrouwbare trend te zien. Doe er een paar bij.`,
    );
  }

  return found.slice(0, MAX_POINTS);
}

function nextStepFor(stats: CategoryStats[]): string {
  const untouched = ALL_CATEGORIES.filter((c) => !stats.some((s) => s.category === c));
  if (untouched.length > 0) {
    return `Volgende stap: doe een sessie ${categoryLabels[untouched[0]]} in de oefenmodus, zodat je ook daar een beginniveau hebt.`;
  }
  const weakest = [...stats].sort((a, b) => a.latest - b.latest)[0];
  if (weakest.percentCorrect < LOW_ACCURACY) {
    return `Volgende stap: oefen ${weakest.label} in de oefenmodus en lees bij elke fout de uitleg helemaal door voordat je verder gaat.`;
  }
  return `Volgende stap: pak ${weakest.label} erbij, dat is nu je laagste categorie. Ga daarna in de testmodus na of het niveau ook zonder tussentijdse feedback standhoudt.`;
}

// Beoordeelt de voortgang van een profiel. `now` wordt meegegeven zodat de
// functie puur en testbaar blijft.
export function assessProgress(profile: Profile, now: Date): Assessment {
  const stats = ALL_CATEGORIES.map((category) => ({
    category,
    results: profile.history.filter((r) => r.category === category),
  }))
    .filter((entry) => entry.results.length > 0)
    .map((entry) => statsFor(entry.category, entry.results, now));

  if (stats.length === 0) {
    return {
      hasData: false,
      headline: 'Er is nog niets te beoordelen: rond eerst een sessie af.',
      stats: [],
      strengths: [],
      improvements: [],
      nextStep: 'Volgende stap: kies een categorie en doe een sessie in de oefenmodus.',
    };
  }

  const sessions = stats.reduce((sum, s) => sum + s.sessions, 0);
  return {
    hasData: true,
    headline: headlineFor(stats, sessions),
    stats,
    strengths: collectStrengths(stats, profile.history, now),
    improvements: collectImprovements(stats),
    nextStep: nextStepFor(stats),
  };
}

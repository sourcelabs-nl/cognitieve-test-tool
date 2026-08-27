// Het huidige scherm staat in de URL, zodat een herlaad je op hetzelfde scherm
// terugzet en de terugknop van de browser binnen de app navigeert in plaats van
// hem af te sluiten. Op een telefoon is dat laatste het belangrijkst: de
// terugveeg is daar de normale manier om een stap terug te doen.
//
// Bewust hash-routing (`location.hash`) en geen History API of routerbibliotheek:
// de app staat op GitHub Pages onder een subpad (zie `base` in vite.config.ts)
// en is een PWA. Met een hash blijft het pad naar index.html altijd hetzelfde,
// dus diep linken en herladen werken zonder serverconfiguratie (geen rewrite
// naar index.html nodig) en de service worker hoeft niets bijzonders te doen.
//
// De pure vertaling tussen URL en schermtoestand staat los van de hook, zodat
// alles zonder DOM te testen is.

import { useSyncExternalStore } from 'react';
import type { Category, Mode } from '../engine/types';

// De schermen van de app. Dezelfde namen als in App.tsx, zodat de component
// zijn eigen woordenschat houdt en de URL-namen hier blijven.
export type Screen =
  | 'profile'
  | 'category'
  | 'intro'
  | 'session'
  | 'results'
  | 'progress'
  | 'leaderboard';

// Alleen de intro en de sessie hebben een categorie en een modus nodig; de
// andere schermen zijn een kaal scherm. Dat verschil staat in het type, zodat je
// geen route kunt bouwen die de helft van zijn gegevens mist.
//
// De modus hoort in de URL omdat een herlaad midden in een test anders stilletjes
// in een oefensessie eindigde: hulp beschikbaar, geen tijdslimiet, en geen
// melding daarvan.
export type Route =
  | { screen: Exclude<Screen, 'intro' | 'session'> }
  | { screen: 'intro'; category: Category; mode: Mode }
  | { screen: 'session'; category: Category; mode: Mode };

// De URL is voor de gebruiker, niet voor de code: Nederlandse woorden in de
// balk, interne Engelse waarden in het programma.
const screenSlugs: Record<Screen, string> = {
  profile: 'profiel',
  category: 'kiezen',
  intro: 'start',
  // Modus-neutraal: op deze route loopt zowel een oefensessie als een test, en
  // `#/oefenen/cijferpatronen/test` zou een Nederlandse lezer tegenspreken.
  session: 'sessie',
  results: 'resultaat',
  progress: 'voortgang',
  leaderboard: 'ranglijst',
};

const categorySlugs: Record<Category, string> = {
  numeric: 'cijferpatronen',
  letters: 'letterpatronen',
  verbal: 'woordrelaties',
  mixed: 'gemengd',
};

// Oefenen is de standaardmodus en krijgt bewust geen eigen segment: dat is de
// modus waarin de meeste mensen zitten, en een korte URL is prettiger. Alleen de
// test wijkt af en zegt dat dan ook (`#/sessie/cijferpatronen/test`).
const TEST_SLUG = 'test';
const DEFAULT_MODE: Mode = 'practice';

// Het scherm waarop je landt als de URL niets bruikbaars zegt. Het profielscherm
// is de enige plek die zonder voorkennis werkt.
export const defaultRoute: Route = { screen: 'profile' };

function screenForSlug(slug: string): Screen | undefined {
  return (Object.keys(screenSlugs) as Screen[]).find((s) => screenSlugs[s] === slug);
}

function categoryForSlug(slug: string): Category | undefined {
  return (Object.keys(categorySlugs) as Category[]).find((c) => categorySlugs[c] === slug);
}

// Bouwt de hash inclusief '#', klaar om in location.hash te zetten.
export function buildHash(route: Route): string {
  const head = `#/${screenSlugs[route.screen]}`;
  if (route.screen === 'intro' || route.screen === 'session') {
    const tail = route.mode === DEFAULT_MODE ? '' : `/${TEST_SLUG}`;
    return `${head}/${categorySlugs[route.category]}${tail}`;
  }
  return head;
}

// Leest een hash uit. Vergevingsgezind in wat hij accepteert (hoofdletters, een
// ontbrekende voorloopslash, een slash op het eind), maar streng in wat hij
// oplevert: alles wat geen geldige route is, valt terug op het profielscherm.
// Zo kan een verzonnen of verminkte URL nooit een leeg scherm opleveren.
export function parseHash(hash: string): Route {
  const parts = hash
    .replace(/^#/, '')
    .toLowerCase()
    .split('/')
    .filter((p) => p.length > 0);

  if (parts.length === 0) return defaultRoute;

  const screen = screenForSlug(parts[0]);
  if (!screen) return defaultRoute;

  if (screen === 'intro' || screen === 'session') {
    if (parts.length !== 2 && parts.length !== 3) return defaultRoute;
    const category = categoryForSlug(parts[1]);
    if (!category) return defaultRoute;
    // Zonder derde deel is het de standaardmodus; staat er wel iets, dan mag dat
    // alleen 'test' zijn. Een verzonnen modus is net zo ongeldig als een
    // verzonnen categorie: liever het profielscherm dan de verkeerde modus.
    if (parts.length === 2) return { screen, category, mode: DEFAULT_MODE };
    if (parts[2] !== TEST_SLUG) return defaultRoute;
    return { screen, category, mode: 'test' };
  }

  // Een scherm zonder categorie verwacht ook geen extra deel in de URL.
  if (parts.length !== 1) return defaultRoute;
  return { screen };
}

// Wat de app op dit moment in het geheugen heeft. De URL kan om een scherm
// vragen dat hier niet uit te tekenen is; resolveRoute bepaalt dan de terugval.
export interface RouteContext {
  hasProfile: boolean; // is er een profiel gekozen
  hasSession: boolean; // loopt er een sessie in het geheugen
  hasResult: boolean; // is er net een sessie afgerond
}

// Zet de gevraagde route om in de route die daadwerkelijk getoond kan worden.
// De opgaven worden procedureel gegenereerd en de sessiestand wordt bewust niet
// bewaard, dus na een herlaad bestaan een lopende sessie en een vers resultaat
// simpelweg niet meer. In plaats van een leeg scherm kies je dan de dichtstbij
// gelegen plek waar de gebruiker verder kan:
//   - zonder profiel: alles naar het profielscherm, want elk ander scherm toont
//     gegevens van iemand;
//   - een sessie zonder sessie: naar de intro van diezelfde categorie en modus,
//     zodat je met een klik weer bezig bent;
//   - een resultaat zonder resultaat: naar het categoriescherm, want een oud
//     resultaat verzinnen kan niet en de voortgang staat een klik verderop.
export function resolveRoute(route: Route, ctx: RouteContext): Route {
  if (!ctx.hasProfile && route.screen !== 'profile') return defaultRoute;
  if (route.screen === 'session' && !ctx.hasSession) {
    // De modus gaat mee: een herlaad midden in een test hoort op de intro van de
    // test uit te komen, niet op die van een oefensessie.
    return { screen: 'intro', category: route.category, mode: route.mode };
  }
  if (route.screen === 'results' && !ctx.hasResult) return { screen: 'category' };
  return route;
}

// --- Koppeling met de browser -----------------------------------------------

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function currentHash(): string {
  return window.location.hash;
}

// De hash is de bron van waarheid; React leest hem alleen. Daardoor kan er geen
// lus ontstaan tussen de listener en het zetten van de hash: navigeren wijzigt
// de hash, de hash wijzigt de state, en de state schrijft alleen terug als de
// balk iets anders zegt dan wat er op het scherm staat (zie replaceHash).
//
// Bewust de ruwe hash en niet meteen de route: de app moet ook merken dat een
// URL die op hetzelfde scherm uitkomt (`#/sessie/onzin` na `#/bestaatniet`)
// nog rechtgezet moet worden.
export function useHash(): string {
  return useSyncExternalStore(subscribe, currentHash, () => '');
}

// Navigeren binnen de app: een nieuwe hash-entry, zodat de terugknop je een
// scherm terugbrengt.
export function navigate(route: Route): void {
  const next = buildHash(route);
  if (window.location.hash === next) return;
  window.location.hash = next;
}

// Een terugval-redirect vervangt de huidige entry in plaats van er een toe te
// voegen. Anders zou de terugknop je terugzetten op de URL die net niet kon en
// meteen weer vooruit worden gestuurd: een lus waarin terug niets lijkt te doen.
export function replaceHash(next: string): void {
  if (window.location.hash === next) return;
  const { pathname, search } = window.location;
  window.location.replace(`${pathname}${search}${next}`);
}

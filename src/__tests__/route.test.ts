// Tests voor de vertaling tussen URL en schermtoestand. Alleen de pure
// functies: die werken zonder DOM, dus zonder browseromgeving in Vitest.

import { describe, expect, it } from 'vitest';
import { buildHash, defaultRoute, parseHash, resolveRoute, type Route } from '../state/route';
import type { Category, Mode } from '../engine/types';

const categories: Category[] = ['numeric', 'letters', 'verbal', 'mixed'];
const modes: Mode[] = ['practice', 'test'];

// Elke intro- en sessieroute in beide modi, plus de schermen zonder categorie.
const allRoutes: Route[] = [
  { screen: 'profile' },
  { screen: 'category' },
  ...categories.flatMap((category) =>
    modes.flatMap((mode): Route[] => [
      { screen: 'intro', category, mode },
      { screen: 'session', category, mode },
    ]),
  ),
  { screen: 'results' },
  { screen: 'progress' },
  { screen: 'leaderboard' },
];

describe('buildHash', () => {
  it('gebruikt Nederlandse woorden in de URL', () => {
    expect(buildHash({ screen: 'profile' })).toBe('#/profiel');
    expect(buildHash({ screen: 'category' })).toBe('#/kiezen');
    expect(buildHash({ screen: 'results' })).toBe('#/resultaat');
    expect(buildHash({ screen: 'progress' })).toBe('#/voortgang');
    expect(buildHash({ screen: 'leaderboard' })).toBe('#/ranglijst');
    // De sessieroute heet 'sessie' en niet 'oefenen': hij draagt nu ook de test,
    // en '#/oefenen/cijferpatronen/test' spreekt zichzelf tegen.
    expect(buildHash({ screen: 'intro', category: 'numeric', mode: 'practice' })).toBe(
      '#/start/cijferpatronen',
    );
    expect(buildHash({ screen: 'session', category: 'verbal', mode: 'practice' })).toBe(
      '#/sessie/woordrelaties',
    );
  });

  it('laat de oefenmodus weg en noemt alleen de test', () => {
    // Oefenen is de standaard en krijgt bewust geen segment: kortere URL voor de
    // modus waar de meeste mensen in zitten.
    expect(buildHash({ screen: 'intro', category: 'numeric', mode: 'test' })).toBe(
      '#/start/cijferpatronen/test',
    );
    expect(buildHash({ screen: 'session', category: 'mixed', mode: 'test' })).toBe(
      '#/sessie/gemengd/test',
    );
  });

  it('levert voor elke route een unieke hash', () => {
    const hashes = allRoutes.map(buildHash);
    expect(new Set(hashes).size).toBe(allRoutes.length);
  });
});

describe('parseHash', () => {
  it('is de omkering van buildHash voor elke route', () => {
    for (const route of allRoutes) {
      expect(parseHash(buildHash(route))).toEqual(route);
    }
  });

  it('accepteert een hash zonder # en zonder voorloopslash', () => {
    expect(parseHash('#/voortgang')).toEqual({ screen: 'progress' });
    expect(parseHash('/voortgang')).toEqual({ screen: 'progress' });
    expect(parseHash('voortgang')).toEqual({ screen: 'progress' });
    expect(parseHash('#voortgang')).toEqual({ screen: 'progress' });
  });

  it('leest zonder modus-segment de oefenmodus', () => {
    expect(parseHash('#/start/cijferpatronen')).toEqual({
      screen: 'intro',
      category: 'numeric',
      mode: 'practice',
    });
    expect(parseHash('#/sessie/gemengd')).toEqual({
      screen: 'session',
      category: 'mixed',
      mode: 'practice',
    });
  });

  it('leest de testmodus uit het derde deel', () => {
    expect(parseHash('#/start/cijferpatronen/test')).toEqual({
      screen: 'intro',
      category: 'numeric',
      mode: 'test',
    });
    expect(parseHash('#/sessie/gemengd/test')).toEqual({
      screen: 'session',
      category: 'mixed',
      mode: 'test',
    });
  });

  it('valt bij een onbekende modus terug op het profielscherm', () => {
    // Net zo streng als bij een onbekende categorie: liever het profielscherm
    // dan gokken en iemand in de verkeerde modus zetten.
    expect(parseHash('#/start/cijferpatronen/onzin')).toEqual(defaultRoute);
    expect(parseHash('#/sessie/cijferpatronen/oefenen')).toEqual(defaultRoute);
    expect(parseHash('#/start/cijferpatronen/test/extra')).toEqual(defaultRoute);
  });

  it('negeert een slash op het eind', () => {
    expect(parseHash('#/kiezen/')).toEqual({ screen: 'category' });
    expect(parseHash('#/start/gemengd/')).toEqual({
      screen: 'intro',
      category: 'mixed',
      mode: 'practice',
    });
    expect(parseHash('#/start/gemengd/test/')).toEqual({
      screen: 'intro',
      category: 'mixed',
      mode: 'test',
    });
  });

  it('is ongevoelig voor hoofdletters', () => {
    expect(parseHash('#/VOORTGANG')).toEqual({ screen: 'progress' });
    expect(parseHash('#/Start/Cijferpatronen')).toEqual({
      screen: 'intro',
      category: 'numeric',
      mode: 'practice',
    });
    expect(parseHash('#/Start/Cijferpatronen/TEST')).toEqual({
      screen: 'intro',
      category: 'numeric',
      mode: 'test',
    });
  });

  it('valt bij een lege hash terug op het profielscherm', () => {
    expect(parseHash('')).toEqual(defaultRoute);
    expect(parseHash('#')).toEqual(defaultRoute);
    expect(parseHash('#/')).toEqual(defaultRoute);
  });

  it('valt bij een onbekend scherm terug op het profielscherm', () => {
    expect(parseHash('#/bestaatniet')).toEqual(defaultRoute);
    expect(parseHash('#/progress')).toEqual(defaultRoute); // Engels bestaat niet
  });

  it('valt bij een onbekende categorie terug op het profielscherm', () => {
    // 'oefenen' is geen scherm meer: de sessieroute heet nu 'sessie'.
    expect(parseHash('#/sessie/onzin')).toEqual(defaultRoute);
    expect(parseHash('#/oefenen/cijferpatronen')).toEqual(defaultRoute);
    expect(parseHash('#/start/numeric')).toEqual(defaultRoute);
  });

  it('valt terug als de categorie ontbreekt', () => {
    expect(parseHash('#/start')).toEqual(defaultRoute);
    expect(parseHash('#/sessie')).toEqual(defaultRoute);
  });

  it('valt terug bij delen die er te veel zijn', () => {
    expect(parseHash('#/voortgang/2024')).toEqual(defaultRoute);
    // Een derde deel mag alleen 'test' zijn; een vierde deel nooit.
    expect(parseHash('#/start/gemengd/extra')).toEqual(defaultRoute);
    expect(parseHash('#/sessie/gemengd/test/nog-meer')).toEqual(defaultRoute);
  });
});

describe('resolveRoute', () => {
  const full = { hasProfile: true, hasSession: true, hasResult: true };

  it('laat een route met alles erbij ongemoeid', () => {
    for (const route of allRoutes) {
      expect(resolveRoute(route, full)).toEqual(route);
    }
  });

  it('stuurt zonder gekozen profiel alles naar het profielscherm', () => {
    const ctx = { ...full, hasProfile: false };
    for (const route of allRoutes) {
      const expected = route.screen === 'profile' ? route : defaultRoute;
      expect(resolveRoute(route, ctx)).toEqual(expected);
    }
  });

  it('stuurt een sessie zonder lopende sessie naar de intro van dezelfde categorie', () => {
    const ctx = { ...full, hasSession: false };
    expect(resolveRoute({ screen: 'session', category: 'letters', mode: 'practice' }, ctx)).toEqual({
      screen: 'intro',
      category: 'letters',
      mode: 'practice',
    });
    // De intro zelf is wel gewoon te tonen.
    expect(resolveRoute({ screen: 'intro', category: 'letters', mode: 'practice' }, ctx)).toEqual({
      screen: 'intro',
      category: 'letters',
      mode: 'practice',
    });
  });

  it('houdt de modus vast bij de terugval naar de intro', () => {
    // De kern van de bug: een herlaad midden in een test kwam uit op de intro van
    // een oefensessie, zonder tijdslimiet en met hulp, en zonder dat je dat zag.
    const ctx = { ...full, hasSession: false };
    for (const category of categories) {
      for (const mode of modes) {
        expect(resolveRoute({ screen: 'session', category, mode }, ctx)).toEqual({
          screen: 'intro',
          category,
          mode,
        });
      }
    }
  });

  it('stuurt een resultaat zonder resultaat naar het categoriescherm', () => {
    const ctx = { ...full, hasResult: false };
    expect(resolveRoute({ screen: 'results' }, ctx)).toEqual({ screen: 'category' });
  });

  it('laat het profielscherm ook zonder profiel staan', () => {
    expect(resolveRoute({ screen: 'profile' }, { hasProfile: false, hasSession: false, hasResult: false })).toEqual({
      screen: 'profile',
    });
  });

  it('levert altijd een route die zichzelf niet nog eens verlegt', () => {
    // Belangrijk tegen een lus: de terugval moet meteen goed zijn.
    const contexts = [
      { hasProfile: false, hasSession: false, hasResult: false },
      { hasProfile: true, hasSession: false, hasResult: false },
      { hasProfile: true, hasSession: true, hasResult: false },
      { hasProfile: true, hasSession: false, hasResult: true },
      full,
    ];
    for (const ctx of contexts) {
      for (const route of allRoutes) {
        const once = resolveRoute(route, ctx);
        expect(resolveRoute(once, ctx)).toEqual(once);
        // De terugval wordt ook in de adresbalk gezet, dus hij moet een URL
        // opleveren die weer op zichzelf uitkomt. Anders blijft de app corrigeren.
        expect(parseHash(buildHash(once))).toEqual(once);
      }
    }
  });
});

import { describe, it, expect } from 'vitest';
import {
  APP_VERSION,
  olderReleases,
  pendingReleases,
  releases,
  releasesSince,
} from '../data/whatsNew';

describe('changelog "Wat is nieuw?"', () => {
  it('de nieuwste release bepaalt de versie van de app', () => {
    expect(releases[0].version).toBe(APP_VERSION);
  });

  it('elke release heeft een datum en minstens een punt', () => {
    for (const release of releases) {
      expect(release.items.length).toBeGreaterThan(0);
      expect(Number.isNaN(new Date(release.date).getTime())).toBe(false);
      for (const item of release.items) expect(item.length).toBeGreaterThan(10);
    }
  });

  it('toont niets als de huidige versie al gezien is', () => {
    expect(releasesSince(APP_VERSION)).toHaveLength(0);
  });

  it('toont alles wat na de laatst geziene versie kwam', () => {
    const older = releases[releases.length - 1].version;
    const expected = older === APP_VERSION ? 0 : releases.length - 1;
    expect(releasesSince(older)).toHaveLength(expected);
  });

  it('toont bij een onbekende versie alleen de nieuwste release', () => {
    expect(releasesSince('0.0.1-onbekend')).toEqual([releases[0]]);
  });

  it('laat een gloednieuwe gebruiker geen changelog zien', () => {
    expect(pendingReleases({ lastSeen: null, hasProfiles: false })).toHaveLength(0);
  });

  it('laat een bestaande gebruiker zonder opgeslagen versie de nieuwste release zien', () => {
    expect(pendingReleases({ lastSeen: null, hasProfiles: true })).toEqual([releases[0]]);
  });

  it('laat niets zien als de gebruiker de huidige versie al kent', () => {
    expect(pendingReleases({ lastSeen: APP_VERSION, hasProfiles: true })).toEqual([]);
  });

  // De kaart toont de nieuwe punten en vouwt de rest van de changelog weg. Die
  // twee samen moeten precies de hele historie zijn: geen release die nergens
  // te lezen is, en geen release die dubbel verschijnt.
  describe('oudere versies terugbladeren', () => {
    it('het uitklapbare deel is precies wat de kaart niet toont', () => {
      const shown = pendingReleases({ lastSeen: null, hasProfiles: true });
      expect([...shown, ...olderReleases(shown)]).toEqual(releases);
    });

    it('werkt ook wanneer de gebruiker meerdere versies heeft overgeslagen', () => {
      const oldest = releases[releases.length - 1].version;
      const shown = releasesSince(oldest);
      expect([...shown, ...olderReleases(shown)]).toEqual(releases);
    });

    it('bij de nieuwste release alleen is de rest van de historie uitklapbaar', () => {
      expect(olderReleases([releases[0]])).toEqual(releases.slice(1));
    });
  });
});

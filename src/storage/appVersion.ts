// Onthoudt welke versie van de app op dit apparaat al is gezien, zodat de
// "Wat is nieuw?"-kaart maar een keer per versie verschijnt. Dit staat bewust
// los van de profielen: het is een eigenschap van het apparaat, niet van de
// gebruiker, en het mag niet meeliften op de export/import van voortgang.

import { APP_VERSION, pendingReleases, type Release } from '../data/whatsNew';
import { loadStore } from './store';

const SEEN_VERSION_KEY = 'cognitieve-test-tool:seen-version';

export function lastSeenVersion(): string | null {
  try {
    return localStorage.getItem(SEEN_VERSION_KEY);
  } catch {
    return null;
  }
}

export function markVersionSeen(version: string = APP_VERSION): void {
  try {
    localStorage.setItem(SEEN_VERSION_KEY, version);
  } catch {
    // Zonder localStorage (privacymodus) verschijnt de kaart elke keer opnieuw;
    // dat is vervelender dan een crash waard is.
  }
}

// De releases die deze gebruiker nog niet heeft gezien.
export function newReleases(): Release[] {
  return pendingReleases({
    lastSeen: lastSeenVersion(),
    hasProfiles: loadStore().profiles.length > 0,
  });
}

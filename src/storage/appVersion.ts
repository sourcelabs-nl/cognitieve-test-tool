// Onthoudt welke versie van de app op dit apparaat al is gezien, zodat de
// "Wat is nieuw?"-kaart maar een keer per versie verschijnt. Dit staat bewust
// los van de profielen: het is een eigenschap van het apparaat, niet van de
// gebruiker, en het mag niet meeliften op de export/import van voortgang.

import { APP_VERSION, pendingReleases, type Release } from '../data/whatsNew';
import { deviceSetting, loadStore } from './store';

const setting = deviceSetting('cognitieve-test-tool:seen-version');

export function lastSeenVersion(): string | null {
  return setting.read();
}

export function markVersionSeen(version: string = APP_VERSION): void {
  setting.write(version);
}

// De releases die deze gebruiker nog niet heeft gezien.
export function newReleases(): Release[] {
  return pendingReleases({
    lastSeen: lastSeenVersion(),
    hasProfiles: loadStore().profiles.length > 0,
  });
}

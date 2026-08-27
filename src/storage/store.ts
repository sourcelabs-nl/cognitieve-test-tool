// Laagje boven localStorage. Houdt alle profielen in een enkele, geversiede
// sleutel, zodat het schema later te migreren is.

import type { Profile } from '../engine/types';

const STORAGE_KEY = 'cognitieve-test-tool:v1';
export const SCHEMA_VERSION = 1;

export interface StoreData {
  version: number;
  profiles: Profile[];
}

function emptyStore(): StoreData {
  return { version: SCHEMA_VERSION, profiles: [] };
}

export function loadStore(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as StoreData;
    if (!parsed || !Array.isArray(parsed.profiles)) return emptyStore();
    return { version: parsed.version ?? SCHEMA_VERSION, profiles: parsed.profiles };
  } catch {
    return emptyStore();
  }
}

export function saveStore(data: StoreData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Een losse instelling van dit APPARAAT, buiten de profielen om. Denk aan de
// laatst geziene versie of het laatst gekozen profiel: dat hoort bij het toestel
// en mag niet meeliften op de export/import van voortgang.
//
// Alle drie de gebruikers hiervan hadden hun eigen kopie van dezelfde try/catch,
// tot op de comment na. Die vangt de privacymodus af, waarin localStorage gooit:
// de instelling geldt dan alleen deze sessie, en dat is vervelender dan een
// crash waard is.
export interface DeviceSetting {
  read(): string | null;
  write(value: string | null): void; // null wist de instelling
}

export function deviceSetting(key: string): DeviceSetting {
  return {
    read() {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write(value) {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        // Zie de toelichting hierboven.
      }
    },
  };
}

// Eenvoudige, voldoende-unieke id zonder externe afhankelijkheid.
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

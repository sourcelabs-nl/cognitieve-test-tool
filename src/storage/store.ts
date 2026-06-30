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

// Eenvoudige, voldoende-unieke id zonder externe afhankelijkheid.
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

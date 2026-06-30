// Export/import van voortgang als JSON-bestand. Lost het grootste nadeel van
// localStorage op: data gaat niet verloren bij het wissen van browsergegevens
// of bij het wisselen van apparaat.

import type { Profile } from '../engine/types';
import { loadStore, saveStore, SCHEMA_VERSION, type StoreData } from './store';

// Geeft de volledige opslag als geformatteerde JSON-string terug.
export function exportToJson(): string {
  return JSON.stringify(loadStore(), null, 2);
}

// Start een download van de huidige voortgang in de browser.
export function downloadExport(): void {
  const blob = new Blob([exportToJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cognitieve-test-voortgang.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  added: number; // nieuw toegevoegde profielen
  merged: number; // bestaande profielen aangevuld met nieuwe sessies
}

// Voegt geimporteerde profielen samen met de bestaande opslag. Bestaande
// profielen (zelfde id) worden aangevuld met sessies die nog niet aanwezig
// zijn; onbekende profielen worden toegevoegd. Gooit bij een ongeldig of
// niet-ondersteund bestand.
export function importFromJson(json: string): ImportResult {
  let parsed: StoreData;
  try {
    parsed = JSON.parse(json) as StoreData;
  } catch {
    throw new Error('Het bestand is geen geldige JSON.');
  }
  if (!parsed || !Array.isArray(parsed.profiles)) {
    throw new Error('Het bestand bevat geen voortgangsgegevens.');
  }
  if (parsed.version > SCHEMA_VERSION) {
    throw new Error('Dit bestand komt uit een nieuwere versie van de tool.');
  }

  const store = loadStore();
  let added = 0;
  let merged = 0;

  for (const incoming of parsed.profiles as Profile[]) {
    const existing = store.profiles.find((p) => p.id === incoming.id);
    if (!existing) {
      store.profiles.push(incoming);
      added += 1;
      continue;
    }
    const knownIds = new Set(existing.history.map((r) => r.id));
    const fresh = incoming.history.filter((r) => !knownIds.has(r.id));
    if (fresh.length > 0) {
      existing.history.push(...fresh);
      merged += 1;
    }
  }

  saveStore(store);
  return { added, merged };
}

// Profielbeheer: aanmaken, opvragen, verwijderen. Geen wachtwoord; profielen
// scheiden alleen de voortgang van verschillende personen op dit apparaat.

import type { Profile } from '../engine/types';
import { loadStore, saveStore, makeId } from './store';

export function listProfiles(): Profile[] {
  return loadStore().profiles;
}

export function getProfile(id: string): Profile | undefined {
  return loadStore().profiles.find((p) => p.id === id);
}

export function createProfile(name: string, avatar?: string): Profile {
  const store = loadStore();
  const profile: Profile = {
    id: makeId('profile'),
    name: name.trim() || 'Naamloos',
    avatar,
    createdAt: new Date().toISOString(),
    history: [],
  };
  store.profiles.push(profile);
  saveStore(store);
  return profile;
}

export function deleteProfile(id: string): void {
  const store = loadStore();
  store.profiles = store.profiles.filter((p) => p.id !== id);
  saveStore(store);
}

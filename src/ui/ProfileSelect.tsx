// Startscherm: kies of maak een profiel. Profielen scheiden de voortgang van
// verschillende personen op dit apparaat. Ook export/import van voortgang.

import { useRef, useState } from 'react';
import type { Profile } from '../engine/types';
import { createProfile, deleteProfile, listProfiles } from '../storage/profiles';
import { downloadExport, importFromJson } from '../storage/transfer';

interface Props {
  onSelect: (profile: Profile) => void;
}

export function ProfileSelect({ onSelect }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>(() => listProfiles());
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = () => setProfiles(listProfiles());

  const handleCreate = () => {
    if (!name.trim()) return;
    const profile = createProfile(name);
    setName('');
    refresh();
    onSelect(profile);
  };

  const handleDelete = (profile: Profile) => {
    const ok = window.confirm(`Profiel "${profile.name}" en alle voortgang verwijderen?`);
    if (!ok) return;
    deleteProfile(profile.id);
    refresh();
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const result = importFromJson(text);
      refresh();
      setMessage(`Geïmporteerd: ${result.added} nieuw, ${result.merged} aangevuld.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Importeren mislukt.');
    }
  };

  return (
    <section className="screen">
      <h1>Cognitieve oefentool</h1>
      <p className="lead">Oefen cijferpatronen, letterpatronen en woordrelaties. De test past zich aan jouw niveau aan.</p>

      <h2>Kies een profiel</h2>
      {profiles.length === 0 && <p className="muted">Nog geen profielen. Maak er hieronder een aan.</p>}
      <ul className="profile-list">
        {profiles.map((p) => (
          <li key={p.id}>
            <button className="profile-button" onClick={() => onSelect(p)}>
              <span className="profile-name">{p.name}</span>
              <span className="muted">{p.history.length} sessies</span>
            </button>
            <button className="delete-button" onClick={() => handleDelete(p)} aria-label={`Verwijder ${p.name}`}>
              🗑
            </button>
          </li>
        ))}
      </ul>

      <div className="new-profile">
        <input
          type="text"
          value={name}
          placeholder="Nieuwe naam"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button className="primary" onClick={handleCreate} disabled={!name.trim()}>
          Profiel aanmaken
        </button>
      </div>

      <div className="transfer">
        <button className="link-button" onClick={downloadExport}>Voortgang exporteren</button>
        <button className="link-button" onClick={() => fileInput.current?.click()}>Voortgang importeren</button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = '';
          }}
        />
      </div>
      {message && <p className="muted">{message}</p>}
    </section>
  );
}

// Startscherm: kies of maak een profiel. Profielen scheiden de voortgang van
// verschillende personen op dit apparaat. Ook export/import van voortgang.

import { useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import type { Profile } from '../engine/types';
import { createProfile, deleteProfile, listProfiles } from '../storage/profiles';
import { downloadExport, importFromJson } from '../storage/transfer';
import { AVATARS } from './avatarData';
import { Avatar } from './avatars';

interface Props {
  onSelect: (profile: Profile) => void;
}

export function ProfileSelect({ onSelect }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>(() => listProfiles());
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[0].id);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = () => setProfiles(listProfiles());

  const handleCreate = () => {
    if (!name.trim()) return;
    const profile = createProfile(name, avatar);
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
              <Avatar id={p.avatar} size={40} />
              <span className="profile-info">
                <span className="profile-name">{p.name}</span>
                <span className="muted">{p.history.length} sessies</span>
              </span>
            </button>
            <button className="icon-button delete-button" onClick={() => handleDelete(p)} aria-label={`Verwijder ${p.name}`}>
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>

      <h2>Nieuw profiel</h2>
      <div className="avatar-picker">
        {AVATARS.map((a) => (
          <button
            key={a.id}
            className={`avatar-choice ${avatar === a.id ? 'selected' : ''}`}
            onClick={() => setAvatar(a.id)}
            aria-label={a.label}
            aria-pressed={avatar === a.id}
            title={a.label}
          >
            <Avatar id={a.id} size={44} />
          </button>
        ))}
      </div>
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
        <button className="btn" onClick={downloadExport}>
          <Download size={18} /> Exporteren
        </button>
        <button className="btn" onClick={() => fileInput.current?.click()}>
          <Upload size={18} /> Importeren
        </button>
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

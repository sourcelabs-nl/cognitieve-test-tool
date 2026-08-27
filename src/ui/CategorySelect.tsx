// Keuzescherm: categorie en modus (oefenen met feedback, of test zonder).

import { useState } from 'react';
import { BarChart3, Home, Pencil, RefreshCw, Trophy } from 'lucide-react';
import type { Category, Mode, Profile } from '../engine/types';
import { categoryLabels } from '../generators';
import { Avatar, AvatarPicker } from './avatars';
import { AVATARS } from './avatarData';
import { VoicePicker } from './VoicePicker';

interface Props {
  profile: Profile;
  onStart: (category: Category, mode: Mode) => void;
  onShowProgress: () => void;
  onShowLeaderboard: () => void;
  onChangeAvatar: (avatarId: string) => void;
  onChangeVoice: (voiceURI: string | null) => void;
  onSwitchProfile: () => void;
}

const categories: { value: Category; description: string }[] = [
  { value: 'numeric', description: 'Getallenreeksen: vind het volgende getal.' },
  { value: 'letters', description: 'Letterreeksen: vind de volgende letter.' },
  { value: 'verbal', description: 'Analogieen: A : B = C : ?' },
  { value: 'mixed', description: 'Een mix van alle categorieen.' },
];

export function CategorySelect({
  profile,
  onStart,
  onShowProgress,
  onShowLeaderboard,
  onChangeAvatar,
  onChangeVoice,
  onSwitchProfile,
}: Props) {
  const [mode, setMode] = useState<Mode>('practice');
  const [showPanel, setShowPanel] = useState(false);

  return (
    <section className="screen">
      <header className="screen-header">
        <h1 className="greeting">
          <button
            className="avatar-button"
            onClick={() => setShowPanel((v) => !v)}
            aria-label="Profiel en avatar"
            aria-expanded={showPanel}
            title="Avatar wijzigen of van profiel wisselen"
          >
            <Avatar id={profile.avatar} size={40} />
            <span className="avatar-switch-badge"><Pencil size={10} /></span>
          </button>
          Hallo, {profile.name}
        </h1>
      </header>

      {showPanel && (
        <div className="profile-panel">
          <p className="muted">Kies je avatar</p>
          <AvatarPicker value={profile.avatar ?? AVATARS[0].id} onChange={onChangeAvatar} />
          {/* De stemkeuze hoort bij de persoon, niet bij het apparaat: twee
              mensen op dezelfde telefoon mogen een andere stem willen. */}
          <VoicePicker value={profile.voiceURI ?? null} onChange={onChangeVoice} />
          <button className="btn" onClick={onSwitchProfile}>
            <RefreshCw size={18} /> Wissel van profiel
          </button>
        </div>
      )}

      <h2>Modus</h2>
      <div className="mode-toggle">
        <label className={mode === 'practice' ? 'selected' : ''}>
          <input type="radio" name="mode" checked={mode === 'practice'} onChange={() => setMode('practice')} />
          <span><strong>Oefenen</strong><br />Directe feedback en uitleg na elke vraag.</span>
        </label>
        <label className={mode === 'test' ? 'selected' : ''}>
          <input type="radio" name="mode" checked={mode === 'test'} onChange={() => setMode('test')} />
          <span><strong>Test</strong><br />Geen feedback tussendoor, alleen een eindrapport.</span>
        </label>
      </div>

      <h2>Kies een categorie</h2>
      <div className="category-grid">
        {categories.map((c) => (
          <button key={c.value} className="category-card" onClick={() => onStart(c.value, mode)}>
            <span className="category-title">{categoryLabels[c.value]}</span>
            <span className="muted">{c.description}</span>
          </button>
        ))}
      </div>

      <div className="footer-actions">
        <button className="btn" onClick={onShowProgress}>
          <BarChart3 size={18} /> Voortgang
        </button>
        <button className="btn" onClick={onShowLeaderboard}>
          <Trophy size={18} /> Ranglijst
        </button>
        {/* Terug naar het profielscherm. Diezelfde stap zit ook achter de
            avatar, maar die is niet te vinden als je hem niet kent. */}
        <button className="btn" onClick={onSwitchProfile}>
          <Home size={18} /> Beginscherm
        </button>
      </div>
    </section>
  );
}

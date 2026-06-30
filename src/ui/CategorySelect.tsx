// Keuzescherm: categorie en modus (oefenen met feedback, of test zonder).

import { useState } from 'react';
import { BarChart3, Trophy, Users } from 'lucide-react';
import type { Category, Mode, Profile } from '../engine/types';
import { categoryLabels } from '../generators';
import { Avatar } from './avatars';

interface Props {
  profile: Profile;
  onStart: (category: Category, mode: Mode) => void;
  onShowProgress: () => void;
  onShowLeaderboard: () => void;
  onSwitchProfile: () => void;
}

const categories: { value: Category; description: string }[] = [
  { value: 'numeric', description: 'Getallenreeksen: vind het volgende getal.' },
  { value: 'letters', description: 'Letterreeksen: vind de volgende letter.' },
  { value: 'verbal', description: 'Analogieen: A : B = C : ?' },
  { value: 'mixed', description: 'Een mix van alle categorieen.' },
];

export function CategorySelect({ profile, onStart, onShowProgress, onShowLeaderboard, onSwitchProfile }: Props) {
  const [mode, setMode] = useState<Mode>('practice');

  return (
    <section className="screen">
      <header className="screen-header">
        <h1 className="greeting"><Avatar id={profile.avatar} size={36} /> Hallo, {profile.name}</h1>
        <button className="btn" onClick={onSwitchProfile}>
          <Users size={18} /> Wisselen
        </button>
      </header>

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
      </div>
    </section>
  );
}

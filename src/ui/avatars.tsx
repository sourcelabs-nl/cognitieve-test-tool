// Avatar-component: een gekleurde cirkel met een lucide-icoon. De definities
// staan in avatarData.ts.

import { AVATARS, avatarById } from './avatarData';

export function Avatar({ id, size = 40 }: { id?: string; size?: number }) {
  const a = avatarById(id);
  const Icon = a.Icon;
  return (
    <span className="avatar" style={{ width: size, height: size, background: a.color }}>
      <Icon size={Math.round(size * 0.55)} color="#fff" />
    </span>
  );
}

// Galerij om een avatar te kiezen. Gebruikt bij het aanmaken en wijzigen.
export function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="avatar-picker">
      {AVATARS.map((a) => (
        <button
          key={a.id}
          className={`avatar-choice ${value === a.id ? 'selected' : ''}`}
          onClick={() => onChange(a.id)}
          aria-label={a.label}
          aria-pressed={value === a.id}
          title={a.label}
        >
          <Avatar id={a.id} size={44} />
        </button>
      ))}
    </div>
  );
}

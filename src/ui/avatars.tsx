// Avatar-component: een gekleurde cirkel met een lucide-icoon. De definities
// staan in avatarData.ts.

import { avatarById } from './avatarData';

export function Avatar({ id, size = 40 }: { id?: string; size?: number }) {
  const a = avatarById(id);
  const Icon = a.Icon;
  return (
    <span className="avatar" style={{ width: size, height: size, background: a.color }}>
      <Icon size={Math.round(size * 0.55)} color="#fff" />
    </span>
  );
}

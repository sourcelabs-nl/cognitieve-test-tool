// Avatar-definities (data). Gescheiden van de component zodat fast-refresh
// blijft werken. Een avatar is een gekleurde cirkel met een lucide-icoon.

import {
  Cat,
  Dog,
  Bird,
  Fish,
  Rabbit,
  Turtle,
  Rocket,
  Star,
  Ghost,
  Crown,
  type LucideIcon,
} from 'lucide-react';

export interface AvatarDef {
  id: string;
  label: string;
  Icon: LucideIcon;
  color: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 'cat', label: 'Kat', Icon: Cat, color: '#f59e0b' },
  { id: 'dog', label: 'Hond', Icon: Dog, color: '#8b5cf6' },
  { id: 'bird', label: 'Vogel', Icon: Bird, color: '#06b6d4' },
  { id: 'fish', label: 'Vis', Icon: Fish, color: '#3b82f6' },
  { id: 'rabbit', label: 'Konijn', Icon: Rabbit, color: '#ec4899' },
  { id: 'turtle', label: 'Schildpad', Icon: Turtle, color: '#10b981' },
  { id: 'rocket', label: 'Raket', Icon: Rocket, color: '#ef4444' },
  { id: 'star', label: 'Ster', Icon: Star, color: '#eab308' },
  { id: 'ghost', label: 'Spook', Icon: Ghost, color: '#6366f1' },
  { id: 'crown', label: 'Kroon', Icon: Crown, color: '#f97316' },
];

export function avatarById(id?: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

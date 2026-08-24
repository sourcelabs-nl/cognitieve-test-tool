// "Wat is nieuw?": verschijnt eenmalig bovenaan zodra de app in een nieuwere
// versie geladen wordt. Bewust een kaart in de pagina en geen blokkerend
// venster: de gebruiker kan hem lezen of gewoon doorgaan.

import { Sparkles, Check } from 'lucide-react';
import type { Release } from '../data/whatsNew';

interface Props {
  releases: Release[];
  onDismiss: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function WhatsNew({ releases, onDismiss }: Props) {
  if (releases.length === 0) return null;

  return (
    <section className="whats-new" aria-labelledby="whats-new-title">
      <h2 id="whats-new-title">
        <Sparkles size={18} /> Wat is nieuw?
      </h2>
      {releases.map((release) => (
        <div key={release.version} className="whats-new-release">
          <p className="muted">
            Versie {release.version} · {formatDate(release.date)}
          </p>
          <ul className="whats-new-list">
            {release.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      <div className="footer-actions">
        <button className="btn" onClick={onDismiss}>
          <Check size={18} /> Duidelijk
        </button>
      </div>
    </section>
  );
}

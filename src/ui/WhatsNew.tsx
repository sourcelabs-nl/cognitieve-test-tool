// "Wat is nieuw?": verschijnt eenmalig bovenaan zodra de app in een nieuwere
// versie geladen wordt. Bewust een kaart in de pagina en geen blokkerend
// venster: de gebruiker kan hem lezen of gewoon doorgaan.
//
// Onder de nieuwe punten zit de oudere changelog uitklapbaar weggevouwen, zodat
// iemand die een paar versies heeft overgeslagen alsnog terug kan bladeren
// zonder dat de kaart standaard een lap tekst wordt.

import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { olderReleases, type Release } from '../data/whatsNew';

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

function ReleaseBlock({ release }: { release: Release }) {
  return (
    <div className="whats-new-release">
      <p className="muted">
        Versie {release.version} · {formatDate(release.date)}
      </p>
      <ul className="whats-new-list">
        {release.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function WhatsNew({ releases, onDismiss }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const visible = releases.length > 0;

  // De kaart staat bovenaan de pagina, maar browsers herstellen bij een herlaad
  // de vorige scrollpositie. Zonder dit hangt de kaart dus boven beeld en ziet
  // niemand hem. Springen zonder animatie: de gebruiker heeft er niet zelf om
  // gevraagd, dus een zichtbaar scrollende pagina zou verwarren.
  // De kaart wordt nooit uit de boom gehaald (App rendert hem altijd), dus de
  // uitklapstand zou blijven hangen. Bij het sluiten terugzetten, zodat een
  // volgende keer weer compact begint.
  useEffect(() => {
    if (visible) window.scrollTo({ top: 0 });
    else setShowHistory(false);
  }, [visible]);

  if (!visible) return null;

  const history = olderReleases(releases);

  return (
    <section className="whats-new" aria-labelledby="whats-new-title">
      <h2 id="whats-new-title">
        <Sparkles size={18} /> Wat is nieuw?
      </h2>

      {releases.map((release) => (
        <ReleaseBlock key={release.version} release={release} />
      ))}

      {showHistory &&
        history.map((release) => <ReleaseBlock key={release.version} release={release} />)}

      {history.length > 0 && (
        <div className="whats-new-history">
          <button
            className="btn"
            onClick={() => setShowHistory(!showHistory)}
            aria-expanded={showHistory}
          >
            {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            {showHistory ? 'Verberg oudere versies' : 'Bekijk oudere versies'}
          </button>
        </div>
      )}

      <div className="footer-actions">
        <button className="btn" onClick={onDismiss}>
          <Check size={18} /> Duidelijk
        </button>
      </div>
    </section>
  );
}

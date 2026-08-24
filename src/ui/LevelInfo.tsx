// Uitklapbare uitleg over hoe het niveau bepaald wordt. Gebruikt op het
// introscherm en het eindscherm, zodat duidelijk is waarom de gebruiker op een
// bepaald niveau zit.

import { useState } from 'react';
import { Info } from 'lucide-react';
import { LEVEL_LABELS } from '../engine/levels';
import { MAX_LEVEL, MIN_LEVEL } from '../engine/types';

const LEVELS = Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, i) => MIN_LEVEL + i);

const EXPLANATION =
  'De test is adaptief: na een goed antwoord wordt de volgende vraag iets moeilijker, na een fout antwoord iets makkelijker. Zo zoekt de test het oefenniveau waarop je ongeveer 3 van de 4 vragen goed hebt. Je eindniveau is het punt waarop je je stabiliseert, niet simpelweg je percentage goed.';

const DISCLAIMER =
  'Let op: dit is een relatief oefenniveau (1 tot 6). De koppeling naar opleidingsniveau hieronder is een globale indicatie en nog niet genormeerd op echte data.';

// Alleen de uitlegtekst + niveau-schaal, zonder knop. Handig om los te tonen.
export function LevelExplanation() {
  return (
    <div className="level-info-text">
      <p>{EXPLANATION}</p>
      <p className="muted">{DISCLAIMER}</p>
      <ul className="level-scale">
        {LEVELS.map((lvl) => (
          <li key={lvl}>
            <strong>Oefenniveau {lvl}</strong> — indicatie: {LEVEL_LABELS[lvl]}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LevelInfo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="level-info">
      <button className="btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Info size={18} /> Hoe werkt mijn niveau?
      </button>
      {open && <LevelExplanation />}
    </div>
  );
}

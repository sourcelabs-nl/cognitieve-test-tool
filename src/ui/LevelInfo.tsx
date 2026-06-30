// Uitklapbare uitleg over hoe het niveau bepaald wordt. Gebruikt op het
// introscherm en het eindscherm, zodat duidelijk is waarom de gebruiker op een
// bepaald niveau zit.

import { useState } from 'react';
import { Info } from 'lucide-react';

const EXPLANATION =
  'Je niveau loopt van 1 (instappend) tot 5 (hbo). De test is adaptief: na een goed antwoord wordt de volgende vraag iets moeilijker, na een fout antwoord iets makkelijker. Zo zoekt de test het niveau waarop je ongeveer 3 van de 4 vragen goed hebt. Je eindniveau is het punt waarop je je stabiliseert, niet simpelweg je percentage goed.';

export function LevelInfo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="level-info">
      <button className="btn" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Info size={18} /> Hoe werkt mijn niveau?
      </button>
      {open && <p className="level-info-text">{EXPLANATION}</p>}
    </div>
  );
}

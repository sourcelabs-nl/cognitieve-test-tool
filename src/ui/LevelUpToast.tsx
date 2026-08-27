// Melding dat er een hoger niveau is bereikt: een korte pop-up die vanzelf
// weer verdwijnt.
//
// Bewust zwevend en niet in de pagina. Als balk in de flow duwde deze melding
// de vraag en de antwoordknoppen omlaag, terwijl het nieuws maar een paar
// seconden relevant is. Hij vangt ook geen tikken op (`pointer-events: none`
// in de CSS), zodat hij niets blokkeert zolang hij in beeld staat.

import { useEffect } from 'react';
import { PartyPopper } from 'lucide-react';

// Lang genoeg om te lezen, kort genoeg om niet in de weg te zitten.
const VISIBLE_MS = 3500;

interface Props {
  level: number;
  onDone: () => void;
}

export function LevelUpToast({ level, onDone }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [level, onDone]);

  return (
    <div className="toast toast-top levelup-toast" role="status">
      <PartyPopper size={20} aria-hidden />
      <span>
        <strong>Gefeliciteerd!</strong> Je oefent nu op niveau {level}.
      </span>
    </div>
  );
}

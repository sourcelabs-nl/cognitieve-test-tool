// Aflopende tijdbalk per vraag, alleen in testmodus (zie engine/timing.ts).
//
// Alleen een balk, geen secondentekst: de lengte zegt het al, en een aftellend
// getal in beeld leidt af van de opgave. De kleur loopt mee van groen via geel
// en oranje naar rood, zodat je in je ooghoek ziet hoe je ervoor staat zonder
// ernaar te hoeven kijken.
//
// Het aftellen zit bewust IN dit component. Zou de resterende tijd in de sessie
// staan, dan hertekende het hele vraagscherm vijf keer per seconde, inclusief de
// opgave en alle antwoordknoppen.
//
// De klok loopt op de wandklok (`performance.now`) en niet op het aantal ticks:
// een tab op de achtergrond krijgt minder ticks, en dan zou de vraag langer
// duren dan de bedoeling is.

import { useEffect, useRef, useState } from 'react';

interface Props {
  limitMs: number;
  // Verandert per vraag. Een nieuwe waarde start de klok opnieuw.
  itemId: string;
  onExpire: () => void;
}

const TICK_MS = 200;

// Kleurtrappen op het AANDEEL resterende tijd, niet op een vast aantal seconden:
// de limiet loopt van 30 tot 80 seconden, dus "nog 10 seconden" betekent op een
// makkelijke vraag iets heel anders dan op een moeilijke.
function stage(fraction: number): string {
  if (fraction > 0.5) return 'ruim';
  if (fraction > 0.25) return 'halverwege';
  if (fraction > 0.1) return 'krap';
  return 'bijna-om';
}

export function TimeBar({ limitMs, itemId, onExpire }: Props) {
  const [leftMs, setLeftMs] = useState(limitMs);
  // In een ref zodat een nieuwe callback de lopende klok niet herstart.
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    const started = performance.now();
    setLeftMs(limitMs);

    const timer = window.setInterval(() => {
      const left = limitMs - (performance.now() - started);
      if (left <= 0) {
        window.clearInterval(timer);
        setLeftMs(0);
        expire.current();
        return;
      }
      setLeftMs(left);
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [itemId, limitMs]);

  const fraction = leftMs / limitMs;

  return (
    // Wel een toegankelijke waarde, geen `aria-live`: een schermlezer kan de
    // resterende tijd opvragen, maar leest hem niet elke seconde ongevraagd voor.
    <div
      className={`time-bar time-bar-${stage(fraction)}`}
      role="progressbar"
      aria-label="Resterende tijd voor deze vraag"
      aria-valuemin={0}
      aria-valuemax={Math.round(limitMs / 1000)}
      aria-valuenow={Math.ceil(leftMs / 1000)}
      aria-valuetext={`Nog ${Math.ceil(leftMs / 1000)} seconden`}
    >
      <div className="time-bar-fill" style={{ width: `${fraction * 100}%` }} />
    </div>
  );
}

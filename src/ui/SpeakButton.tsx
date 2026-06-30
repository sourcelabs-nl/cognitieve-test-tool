// Voorleesknop: leest de meegegeven tekst voor met tekst-naar-spraak. Klik
// nogmaals om te stoppen. Toont niets als de browser geen spraak ondersteunt.

import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { speak, speechSupported, stopSpeaking } from './speech';

interface Props {
  text: string;
  label?: string;
}

export function SpeakButton({ text, label = 'Lees voor' }: Props) {
  const [speaking, setSpeaking] = useState(false);

  // Stop spraak als de knop uit beeld gaat.
  useEffect(() => () => stopSpeaking(), []);

  if (!speechSupported) return null;

  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(text, () => setSpeaking(false));
  };

  return (
    <button
      className="icon-button speak-button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={speaking}
    >
      {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}

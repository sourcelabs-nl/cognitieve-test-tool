// Instelling: welke stem leest de vragen voor? De Web Speech API geeft geen
// kwaliteitsoordeel, dus de app kiest automatisch de beste kandidaat en de
// gebruiker kan daar altijd overheen kiezen. Toont niets zonder spraakondersteuning.
//
// De keuze hoort bij het profiel en wordt daar ook bewaard (`Profile.voiceURI`),
// net als de avatar. Dit component houdt dus zelf niets vast: `value` en
// `onChange` zijn verplicht, precies zoals bij `AvatarPicker`.
// De selectielogica (beste stem, terugval als de stem hier niet bestaat) staat
// in `speech.ts`, want die hangt niet af van waar de keuze bewaard wordt.

import { useEffect, useSyncExternalStore } from 'react';
import { Play } from 'lucide-react';
import {
  dutchVoices,
  pickBestVoice,
  speak,
  speechSupported,
  stopSpeaking,
  subscribeVoices,
  voiceCount,
} from './speech';

const SAMPLE = 'Welke reeks hoort hierbij? 2, 4, 6, 8.';

interface Props {
  value: string | null; // null = automatisch de beste stem
  onChange: (voiceURI: string | null) => void;
}

export function VoicePicker({ value, onChange }: Props) {
  // De stemmenlijst komt asynchroon binnen; hertekenen zodra dat gebeurt.
  const count = useSyncExternalStore(subscribeVoices, voiceCount, () => 0);

  useEffect(() => () => stopSpeaking(), []);

  if (!speechSupported || count === 0) return null;

  const voices = dutchVoices();
  const automatic = pickBestVoice(voices);
  const choice = value ?? '';

  return (
    <div className="voice-picker">
      <label htmlFor="voice-select">Voorleesstem</label>
      <select
        id="voice-select"
        value={choice}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Automatisch{automatic ? `: ${automatic.name}` : ''}</option>
        {voices.map((v) => (
          <option key={`${v.voiceURI}|${v.lang}`} value={v.voiceURI}>
            {v.name} ({v.lang})
          </option>
        ))}
      </select>
      <div className="footer-actions">
        {/* Expliciet `choice || null`: null betekent hier "kies automatisch",
            zodat de voorbeeldknop laat horen wat de gebruiker net koos. */}
        <button className="btn" onClick={() => speak(SAMPLE, undefined, choice || null)}>
          <Play size={18} /> Beluister
        </button>
      </div>
      {/* Welke stemmen er zijn, bepaalt het toestel. Op een kale Mac of iPhone
          staan alleen de oude, blikkerige stemmen; de betere zijn gratis bij te
          installeren. Zonder deze zin lijkt dat een tekortkoming van de app. */}
      <p className="muted">
        Klinkt de stem blikkerig? Op veel toestellen kun je in de instellingen een
        betere Nederlandse stem downloaden. Die verschijnt dan vanzelf in deze lijst.
      </p>
    </div>
  );
}

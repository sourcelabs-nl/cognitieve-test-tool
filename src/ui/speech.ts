// Tekst-naar-spraak via de Web Speech API van de browser. Volledig client-side.
// De browser kiest zonder hulp de standaardstem van het besturingssysteem, en dat
// is vaak de oudste en meest robotachtige stem die er is. Daarom kiezen we hier
// zelf actief de beste beschikbare Nederlandse stem, met een handmatige voorkeur
// van de gebruiker die daar altijd overheen gaat.

import type { ItemGrid } from '../engine/types';

// Niet alleen kijken of de sleutel bestaat: sommige omgevingen hebben wel de
// eigenschap maar geen object erachter.
export const speechSupported =
  typeof window !== 'undefined' && !!window.speechSynthesis;

// Alleen de velden die we nodig hebben, zodat de rangschikking testbaar is
// zonder een echte SpeechSynthesisVoice.
export interface VoiceLike {
  name: string;
  lang: string;
  voiceURI: string;
}

// nl-NL boven een andere Nederlandse variant (nl-BE), en Nederlands boven de rest.
function langScore(lang: string): number {
  const l = lang.toLowerCase().replace('_', '-');
  if (l === 'nl-nl' || l === 'nl') return 2;
  if (l.startsWith('nl')) return 1;
  return 0;
}

// De API heeft geen kwaliteitsveld, dus we leiden de kwaliteit af uit de naam.
// Hoger is beter.
function qualityScore(name: string, lang: string): number {
  const n = name.toLowerCase();
  // "Google Nederlands" staat bovenaan omdat de gebruiker daar expliciet om heeft
  // gevraagd, niet omdat we die kwaliteit gemeten hebben. Niet "corrigeren" naar
  // Premium/Enhanced. Op Apple-toestellen bestaat deze stem niet en geldt de rest
  // van de lijst hieronder gewoon als terugval.
  if (n.includes('google') && langScore(lang) > 0) return 6;
  if (n.includes('premium')) return 5;
  // "Enhanced" heet op een Nederlandstalig apparaat "Verbeterd".
  if (n.includes('enhanced') || n.includes('verbeterd')) return 4;
  if (n.includes('siri')) return 3;
  if (n.includes('google')) return 2;
  if (n.includes('natural') || n.includes('neural')) return 1;
  return 0;
}

// getVoices() levert soms dubbelen; voiceURI plus lang is de stabiele sleutel.
function dedupe<T extends VoiceLike>(voices: T[]): T[] {
  const seen = new Set<string>();
  return voices.filter((v) => {
    const key = `${v.voiceURI}|${v.lang}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Beste stem eerst. We filteren bewust NIET op `localService`: dat is geen
// kwaliteitsvlag, en juist de remote "Google Nederlands" klinkt op Chrome beter
// dan de lokale stem. Kanttekening: bij een remote stem gaat de voorgelezen tekst
// naar de leverancier van de stem. Voor deze app is dat acceptabel, want het gaat
// om oefenopgaven en niet om persoonsgegevens.
export function rankVoices<T extends VoiceLike>(voices: T[]): T[] {
  return dedupe(voices ?? []).sort(
    (a, b) =>
      langScore(b.lang) - langScore(a.lang) ||
      qualityScore(b.name, b.lang) - qualityScore(a.name, a.lang) ||
      a.name.localeCompare(b.name),
  );
}

// De beste stem, of null als er geen enkele stem beschikbaar is.
export function pickBestVoice<T extends VoiceLike>(voices: T[]): T | null {
  return rankVoices(voices)[0] ?? null;
}

// --- Stemmenlijst ophalen ----------------------------------------------------
// getVoices() is bij de eerste aanroep vaak leeg: de browser vult de lijst
// asynchroon en meldt dat via het 'voiceschanged'-event. Op iOS gebeurt dat pas
// na de eerste gebruikersinteractie. We cachen daarom en laten de UI zich
// abonneren op wijzigingen.

// De lijst wordt hier meteen gerangschikt bewaard. Dat is de enige plek waar hij
// verandert, dus zo sorteert de app een keer per 'voiceschanged' in plaats van
// bij elke aanroep van speak() of bij elke render van de stemkiezer.
let cache: SpeechSynthesisVoice[] = [];
let hooked = false;
const listeners = new Set<() => void>();

function readVoices(): void {
  try {
    cache = rankVoices(window.speechSynthesis.getVoices() ?? []);
  } catch {
    cache = [];
  }
  listeners.forEach((cb) => cb());
}

export function availableVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported) return [];
  if (!hooked) {
    hooked = true;
    try {
      window.speechSynthesis.addEventListener?.('voiceschanged', readVoices);
    } catch {
      // Oudere implementaties zonder addEventListener: dan blijft het bij de
      // lijst die getVoices() nu teruggeeft.
    }
  }
  if (cache.length === 0) readVoices();
  return cache;
}

export function subscribeVoices(callback: () => void): () => void {
  listeners.add(callback);
  availableVoices(); // haal de lijst op en hook aan, buiten de render om
  return () => listeners.delete(callback);
}

// Puur, en dus veilig als `getSnapshot` van useSyncExternalStore. `availableVoices`
// mag daar niet: die haakt listeners aan en notificeert abonnees, en dat hoort
// niet vanuit een render te gebeuren.
export function voiceCount(): number {
  return cache.length;
}

// De Nederlandse stemmen, beste eerst. Zijn er geen, dan alle stemmen, zodat de
// gebruiker altijd iets te kiezen heeft. De lijst is al gerangschikt (zie
// `readVoices`), dus filteren behoudt de volgorde.
export function dutchVoices(): SpeechSynthesisVoice[] {
  const all = availableVoices();
  const dutch = all.filter((v) => langScore(v.lang) > 0);
  return dutch.length > 0 ? dutch : all;
}

// De selectielogica staat bewust hier en niet in de opslag: welke stem de beste is
// en hoe je terugvalt hangt niet af van waar de voorkeur bewaard wordt (apparaat of
// profiel). Bestaat de voorkeurstem hier niet (meer), dan wint de automatische keuze.
export function resolveVoice<T extends VoiceLike>(voices: T[], preferredURI?: string | null): T | null {
  if (voices.length === 0) return null;
  const match = preferredURI ? voices.find((v) => v.voiceURI === preferredURI) : undefined;
  return match ?? pickBestVoice(voices);
}

// De voorkeur van het actieve profiel, gezet door App zodra er een profiel
// gekozen is. Bewust een module-variabele en geen prop: de voorleesknop staat op
// een stuk of tien plekken, en een stem-prop door al die componenten heen rijgen
// zou ze vervuilen zonder dat ze er iets mee doen. Zonder profiel valt de app
// terug op de apparaat-opslag.
let activeVoiceURI: string | null = null;

export function setActiveVoice(voiceURI: string | null): void {
  activeVoiceURI = voiceURI;
}

// De stem die de app nu gebruikt. `preferredURI` weglaten betekent "gebruik de
// voorkeur van het profiel"; expliciet `null` meegeven betekent "kies
// automatisch", wat de voorbeeldknop in de stemkiezer nodig heeft.
export function currentVoice(preferredURI?: string | null): SpeechSynthesisVoice | null {
  const preference = preferredURI === undefined ? activeVoiceURI : preferredURI;
  return resolveVoice(dutchVoices(), preference);
}

// --- Voorlezen ---------------------------------------------------------------

export function stopSpeaking(): void {
  if (speechSupported) window.speechSynthesis.cancel();
}

// `preferredURI` is optioneel: geef hem mee als de voorkeur ergens anders vandaan
// komt dan de apparaat-opslag (bijvoorbeeld een profielveld of een voorbeeldknop).
export function speak(text: string, onEnd?: () => void, preferredURI?: string | null): void {
  if (!speechSupported) return;
  window.speechSynthesis.cancel(); // onderbreek wat nog loopt
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'nl-NL'; // terugval als er geen stem gezet kan worden
  const voice = currentVoice(preferredURI);
  if (voice) utterance.voice = voice;
  // Iets langzamer dan normaal blijft ook bij een goede stem passend: het gaat om
  // reeksen cijfers en letters, en die moet je kunnen meeschrijven. De 0.95 was
  // dus geen pleister voor een slechte stem en kan blijven staan.
  utterance.rate = 0.95;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  window.speechSynthesis.speak(utterance);
}

// Zet een prompt met regeleinden om naar vlot voorleesbare tekst.
export function toSpoken(text: string): string {
  return text.replace(/\n+/g, '. ').replace(/\s*\?\s*$/, '?');
}

// Leest een raster rij voor rij voor. Zonder deze omzetting hoort iemand die de
// vraag laat voorlezen alleen de vraagtekst en mist hij de hele opgave.
export function gridToSpoken(grid: ItemGrid): string {
  const rows: string[] = [];
  for (let start = 0; start < grid.cells.length; start += grid.cols) {
    const cells = grid.cells
      .slice(start, start + grid.cols)
      .map((cell) => (cell === '?' ? 'het gevraagde vakje' : cell));
    rows.push(`Rij ${rows.length + 1}: ${cells.join(', ')}.`);
  }
  return rows.join(' ');
}

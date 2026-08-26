// Tekst-naar-spraak via de Web Speech API van de browser. Volledig client-side,
// gebruikt een Nederlandse stem als die beschikbaar is.

import type { ItemGrid } from '../engine/types';

export const speechSupported =
  typeof window !== 'undefined' && 'speechSynthesis' in window;

export function stopSpeaking(): void {
  if (speechSupported) window.speechSynthesis.cancel();
}

export function speak(text: string, onEnd?: () => void): void {
  if (!speechSupported) return;
  window.speechSynthesis.cancel(); // onderbreek wat nog loopt
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'nl-NL';
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

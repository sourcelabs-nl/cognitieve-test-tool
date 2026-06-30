// Tekst-naar-spraak via de Web Speech API van de browser. Volledig client-side,
// gebruikt een Nederlandse stem als die beschikbaar is.

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

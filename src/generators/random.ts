// Kleine random-helpers. Centraal zodat tests desgewenst kunnen seeden.

export function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function pick<T>(items: readonly T[]): T {
  return items[randInt(0, items.length - 1)];
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Bouwt meerkeuze-opties rond een juist antwoord met plausibele afleiders.
// Afleiders worden uniek gemaakt en mogen niet samenvallen met het juiste
// antwoord. Geeft de geschudde opties terug plus de index van het juiste.
export function buildOptions(
  correct: string,
  distractors: string[],
): { options: string[]; correctIndex: number } {
  const unique: string[] = [];
  for (const d of distractors) {
    if (d !== correct && !unique.includes(d)) unique.push(d);
  }
  const chosen = unique.slice(0, 3);
  const options = shuffle([correct, ...chosen]);
  return { options, correctIndex: options.indexOf(correct) };
}

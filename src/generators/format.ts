// Gedeelde tekst-hulpjes voor uitleg bij gegenereerde items.

// Schrijft een stap als "+3" of "-3", zodat uitleg met negatieve stappen
// leesbaar blijft (niet "+-3").
export function stepLabel(step: number): string {
  return step < 0 ? `-${-step}` : `+${step}`;
}

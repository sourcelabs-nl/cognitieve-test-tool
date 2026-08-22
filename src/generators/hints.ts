// Eerste trede van de hulp: hoe pak je dit soort vraag aan?
//
// Deze tekst is bewust per categorie en niet per strategie. Zou hij de familie
// van het item verklappen ("dit is een verweven reeks"), dan was de vraag al
// half beantwoord. De tekst noemt daarom alle sporen die je kunt volgen, zodat
// de gebruiker zelf moet bepalen welk spoor hier opgaat.

import type { ItemCategory } from '../engine/types';

export const STRATEGY_HINTS: Record<ItemCategory, string> = {
  numeric:
    'Kijk eerst naar het verschil tussen twee opeenvolgende getallen. Blijft dat verschil steeds gelijk, dan is er een vaste stap. Verandert het verschil telkens, kijk dan of die verandering zelf een patroon volgt. Springt de reeks heen en weer of groeit hij snel, probeer dan te delen of te vermenigvuldigen in plaats van op te tellen. Lukt niets daarvan, kijk dan eens naar alleen de 1e, 3e en 5e positie: mogelijk staan er twee reeksen door elkaar.',
  letters:
    'Zet de letters eerst om naar hun plaats in het alfabet (A=1, B=2, C=3, ... Z=26). Daarna reken je met die getallen. Kijk naar de sprong tussen twee opeenvolgende letters: blijft die gelijk, wordt hij steeds groter of kleiner, of gaat hij om en om vooruit en achteruit? Lukt dat niet, kijk dan eens naar alleen de 1e, 3e en 5e letter: mogelijk staan er twee reeksen door elkaar.',
  verbal:
    'Zeg eerst in een korte, precieze zin welke relatie er tussen de eerste twee woorden zit. Hoe scherper die zin, hoe makkelijker het wordt. Vul daarna het derde woord in diezelfde zin in en kijk welke van de vier opties hem kloppend maakt. Pas op voor opties die wel met het onderwerp te maken hebben, maar niet in dezelfde relatie staan: dat zijn de valkuilen.',
};

// Eerste trede van de hulp: hoe pak je dit soort vraag aan?
//
// Deze tekst is bewust per vraagvorm en niet per strategie. Zou hij de familie
// van het item verklappen ("dit is een verweven reeks"), dan was de vraag al
// half beantwoord. De tekst noemt daarom alle sporen die je kunt volgen, zodat
// de gebruiker zelf moet bepalen welk spoor hier opgaat.
//
// Wel per vorm: bij een raster of een "welke hoort niet in de rij" is de aanpak
// wezenlijk anders dan bij een reeks, dus een gedeelde tekst zou daar niet
// kloppen.
//
// Let op bij het formuleren van de woordrelatie-teksten: geen enkel antwoord
// uit de banken mag er als heel woord in voorkomen. Gewone woorden zijn
// riskant, want "bij", "hand", "fout" en "antwoord" zijn ook antwoorden.
// `__tests__/hints.test.ts` bewaakt dat.

import type { ItemForm } from '../engine/types';

export const STRATEGY_HINTS: Record<ItemForm, string> = {
  numericSeries:
    'Kijk eerst naar het verschil tussen twee opeenvolgende getallen. Blijft dat verschil steeds gelijk, dan is er een vaste stap. Verandert het verschil telkens, kijk dan of die verandering zelf een patroon volgt. Springt de reeks heen en weer of groeit hij snel, probeer dan te delen of te vermenigvuldigen in plaats van op te tellen. Lukt niets daarvan, kijk dan eens naar alleen de 1e, 3e en 5e positie: mogelijk staan er twee reeksen door elkaar.',

  numericGrid:
    'In een raster loopt de regel niet van links naar rechts door alles heen, maar binnen elke rij of binnen elke kolom apart. Zoek een rij of kolom die helemaal gevuld is en probeer daar hoe je van de eerste twee vakjes naar het derde komt: optellen, aftrekken, vermenigvuldigen, of twee bewerkingen achter elkaar. Toets die regel daarna op een tweede volle rij of kolom. Klopt hij ook daar, pas hem dan toe op de rij of kolom met het lege vakje.',

  numericOddOne:
    'De rij volgt bijna helemaal een regel: precies een getal breekt hem. Zoek die regel eerst met de getallen aan het begin van de rij, want daar zit de afwijking meestal niet. Reken de rij daarna zelf uit volgens die regel en vergelijk stap voor stap met wat er staat. Het eerste getal dat afwijkt is niet altijd de boosdoener: controleer of de hele rij weer klopt zodra je juist dat ene getal vervangt.',

  letterSeries:
    'Zet de letters eerst om naar hun plaats in het alfabet (A=1, B=2, C=3, ... Z=26). Daarna reken je met die getallen. Kijk naar de sprong tussen twee opeenvolgende letters: blijft die gelijk, wordt hij steeds groter of kleiner, of gaat hij om en om vooruit en achteruit? Lukt dat niet, kijk dan eens naar alleen de 1e, 3e en 5e letter: mogelijk staan er twee reeksen door elkaar.',

  letterOddOne:
    'Zet de letters eerst om naar hun plaats in het alfabet (A=1, B=2, C=3, ... Z=26). De rij volgt bijna helemaal een regel: precies een letter breekt hem. Zoek die regel met de eerste letters van de rij, want daar zit de afwijking meestal niet, en reken de rij daarna zelf uit. Vergelijk stap voor stap met wat er staat en controleer of de hele rij weer klopt zodra je juist die ene letter vervangt.',

  verbalSingle:
    'Zeg eerst in een korte, precieze zin welke relatie er tussen de eerste twee woorden zit. Hoe scherper die zin, hoe makkelijker het wordt. Vul daarna het derde woord in diezelfde zin in en kijk welke van de vier opties hem kloppend maakt. Pas op voor opties die wel met het onderwerp te maken hebben, maar niet in dezelfde relatie staan: dat zijn de valkuilen.',

  verbalDouble:
    'Er ontbreken hier twee woorden, dus de relatie tussen de eerste twee woorden kun je niet zomaar aflezen. Kijk daarom eerst naar de twee woorden die er wel staan en zeg in een korte zin hoe die zich tot elkaar verhouden. Vul daarna elk aangeboden paar in en lees de hele regel hardop na: alleen het juiste paar maakt zowel de linkerkant als de rechterkant kloppend. Een paar waarvan maar een helft past is een valkuil.',
};

# Verbeterplan

Roadmap voor de adaptieve cognitieve oefentool. Geordend op prioriteit. De
nadruk ligt op het representatief en valide maken van de niveaus, want dat is
nu de grootste beperking: de niveaus 1-5 en hun mbo/hbo-koppeling zijn aannames,
nog niet genormeerd op echte data.

## Context (huidige stand)

- Volledig client-side React + Vite + TS, installeerbare PWA.
- Categorieen: cijferpatronen, letterpatronen, woordrelaties, gemengd.
- Adaptief via een weighted up/down staircase (mikt op ~75% goed).
- Score/gamification, profielen, voortgang en leaderboard in `localStorage`.
- Niveaus worden eerlijk gepresenteerd als relatief **oefenniveau** met de
  mbo/hbo-koppeling als "indicatie" plus disclaimer.

## Prioriteit 1: Validiteit en kalibratie van de niveaus

Doel: kunnen onderbouwen dat oefenniveau X overeenkomt met een bepaald
opleidings-/denkniveau, in plaats van een aanname.

### 1a. Centrale (anonieme) dataverzameling

Voorwaarde voor alles hieronder: er is nu geen centrale dataset.

- Verzamel per beantwoord item anoniem: itemtype, categorie, gegenereerd
  niveau, goed/fout, responstijd, sessie-id, tijdstip. Voor gegenereerde items
  ook de genererende parameters (zodat een item reproduceerbaar is).
- Opties oplopend in zwaarte:
  - Lichtgewicht: een eindpunt dat geaggregeerde JSON ontvangt (bv. een kleine
    serverless functie + opslag).
  - Volwaardig: kleine backend met database.
- Privacy: geen herleidbare persoonsgegevens; expliciete opt-in; duidelijke
  uitleg waarvoor de data dient.

### 1b. Itemkalibratie (IRT)

- Schat per item een moeilijkheidsparameter (b) uit de verzamelde responses
  (richtlijn: honderden responses per item voor een stabiele schatting).
- Voor procedureel gegenereerde items: kalibreer per generator-niveau en per
  patroontype (familie), niet per losse trekking.
- Vervang de aangenomen niveaus door data-gedreven moeilijkheid.

### 1c. Normering naar opleidingsniveau

- Referentiegroep met bekend niveau (mbo-3, mbo-4, hbo) laat de tool maken;
  bepaal empirisch welk toolniveau bij welk opleidingsniveau hoort.
- Eventueel concurrente validatie: deelnemers maken naast deze tool een al
  gevalideerde capaciteitentest; bereken de correlatie.
- Pas daarna de labels (`engine/levels.ts`) aan op basis van de uitkomsten en
  haal de disclaimer weg.

## Prioriteit 2: Adaptief algoritme naar IRT/CAT

- Na kalibratie: vervang de staircase door een CAT-aanpak. Schat de vaardigheid
  (theta) met maximum likelihood en kies steeds het item met de hoogste
  informatiewaarde rond theta.
- Voordelen: nauwkeuriger, minder items nodig voor dezelfde betrouwbaarheid.
- Het huidige ontwerp laat dit toe (zie `engine/adaptive.ts`, `SessionState`).

## Prioriteit 3: Itembank en inhoud

- Woordrelaties: bank vergroten (nu ~40 items) en spreiden over de niveaus;
  dubbelzinnigheid handmatig blijven controleren.
- Cijfer-/letterpatronen: meer strategie-families toevoegen, mits eenduidig en
  testbaar.
- Eventueel categorieen uit het oorspronkelijke bouwdoc toevoegen: abstracte
  figuurreeksen (SVG) en rekenkundig redeneren.
- Itemkwaliteit blijven borgen met de bestaande validatie-tests.

## Prioriteit 4: Inzicht en feedback

- Voortgang: naast het 7-daagse venster ook een maand-/totaaloverzicht.
- Eindrapport: per patroontype laten zien waar sterktes/zwaktes zitten.
- Aanbevelingen: "oefen vooral op letterpatronen, daar zit de meeste winst".

## Prioriteit 5: Toegankelijkheid en UX

- Toegankelijkheid: toetsenbordnavigatie, focus-states, contrast en
  screenreader-labels nalopen (WCAG).
- Voorlezen: keuze uit stemmen en snelheid; markeren wat voorgelezen wordt.
- Instelbare sessielengte en een pauzeknop.

## Prioriteit 6: Techniek en kwaliteit

- Meer tests: UI-componenten (bv. met Testing Library) naast de bestaande
  unit-tests voor generatoren, staircase, scoring en datum-venster.
- Foutafhandeling rond `localStorage` (quota, privato-modus).
- Optioneel online profielen/leaderboard (vereist de backend uit 1a) zodat
  voortgang tussen apparaten synchroniseert.

## Afhankelijkheden in het kort

```
1a dataverzameling  ->  1b itemkalibratie  ->  1c normering  ->  2 IRT/CAT
                                                  \-> labels valideren
```

Zonder 1a (centrale data) blijven de niveau-labels een indicatie. Alle inhoud-,
UX- en techniekverbeteringen (prioriteit 3-6) kunnen daar los van doorlopen.

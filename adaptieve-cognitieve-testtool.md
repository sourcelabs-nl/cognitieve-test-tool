# Adaptieve cognitieve testtool: bouwdocument

Dit document beschrijft de te bouwen oefentool voor cognitieve capaciteitentests. Het is bedoeld als input voor Claude Code: het legt scope, architectuur, datacontracten en bouwvolgorde vast.

## 1. Doel en scope

Een web-app waarmee een gebruiker cognitieve capaciteitentests kan oefenen. De test is adaptief: items worden moeilijker bij goede prestaties en makkelijker bij zwakke prestaties. Doelniveau van de gebruikers is mbo 3-4 tot hbo. De gebruiker kiest zelf de categorie waarin geoefend wordt.

Technische keuze: React web-app, volledig client-side (geen backend voor v1).

Prioriteiten (hoog naar laag):
1. Inhoudelijk goede vragen
2. Net werkend adaptief algoritme
3. Verzorgde UI/UX
4. Snelheid van opleveren

### Categorieën v1

De meest gangbare types, met de gebruiker als kiezer:

- Numeriek: cijferreeksen en rekenkundig redeneren (percentages, verhoudingen)
- Verbaal: woordanalogieen en verbaal redeneren (waar / onwaar / onbekend)
- Abstract / logisch: figurenreeksen en matrix-redeneren

Ook een gemengde modus die alle categorieen afwisselt.

## 2. Itemstrategie

Een vaste vragenlijst is snel uitgespeeld en moeilijk op niveau te schalen. Daarom per categorie een aanpak die items op een instelbaar moeilijkheidsniveau (1 tot 5) levert.

### Numeriek: procedureel genereren

Goed haalbaar. Elke generator krijgt een niveau mee en produceert een item met gegarandeerd een eindig juist antwoord.

Cijferreeksen, oplopend in complexiteit:

- Niveau 1: enkele bewerking, constante stap (bijvoorbeeld +3, +3, +3)
- Niveau 2: oplopende stap (+2, +3, +4)
- Niveau 3: twee verweven reeksen (afwisselende posities)
- Niveau 4: combinatie van optellen en vermenigvuldigen
- Niveau 5: kwadraten, priemreeksen, Fibonacci-achtige reeksen

Rekenkundig redeneren: parameterbereik (bedragen, percentages) en aantal rekenstappen schalen mee met het niveau. Niveau 1 is een eenstapssom, niveau 5 is meerstaps met plausibele afleiders.

### Verbaal: gecureerde itembank

Niet on-the-fly genereren in de browser; kwaliteit is zonder taalmodel of gecureerde data moeilijk te garanderen. Gebruik een vooraf samengestelde itembank met een moeilijkheidslabel per item. De bank mag offline met een LLM zijn aangevuld, maar moet handmatig gecontroleerd zijn.

### Abstract: SVG-generatie of getagde bank

Volledig procedureel genereren is hier het meeste werk. Pragmatische aanpak voor v1: figuren als SVG opgebouwd uit eigenschappen (vorm, aantal, rotatie, vulling, kleur), met een regel die deze eigenschappen per stap transformeert. Moeilijkheid is het aantal tegelijk veranderende eigenschappen.

Als de SVG-generatie te veel tijd kost, gebruik dan voor v1 een getagde bank (zoals bij verbaal) en voeg generatie later toe.

### Validatie van items

- Elk item heeft exact een juist antwoord. Reeksen kunnen meerdere logische voortzettingen hebben, dus houd generatoren bewust beperkt om dubbelzinnigheid te voorkomen.
- Schrijf voor elke generator een test die controleert dat het opgegeven juiste antwoord daadwerkelijk klopt.

## 3. Adaptief algoritme

Voor v1 een staircase-heuristiek, met een ontwerp dat een latere IRT-upgrade niet blokkeert.

### Staircase

- Houd een continue niveau-schatting bij, bereik 1.0 tot 5.0, start op 2.5.
- Goed antwoord verhoogt de schatting, fout verlaagt deze.
- Gebruik een afnemende stapgrootte: start bijvoorbeeld op 0.5 en verklein de stap na elke richtingsomkering, zodat de schatting inschommelt rond het werkelijke niveau.
- Optioneel snelheid meewegen: snel en goed geeft een iets grotere opstap.
- Vertaal de continue schatting naar een discreet generatie-niveau (1 tot 5) via afronden of drempels.

### Stop en score

- Stopcriterium: vast aantal items (15 tot 20) of een stabiele schatting (minimale stapgrootte bereikt).
- Eindscore per categorie: de uiteindelijke niveau-schatting, het percentage goed en de gemiddelde responstijd.

### Latere upgrade naar IRT / CAT

Geef elk item een gekalibreerde moeilijkheidsparameter (b). Schat de vaardigheid (theta) met maximum likelihood en kies steeds het item met de hoogste informatiewaarde rond theta. Dit vereist verzamelde responsdata om te kalibreren. Het ontwerp moet dit toelaten, maar v1 hoeft het niet te implementeren.

## 4. Architectuur

React, client-side. Voorgestelde structuur:

```
src/
  engine/
    adaptive.ts        staircase-logica, niveau-schatting
    types.ts           Item, Answer, SessionState
  generators/
    numeric.ts         cijferreeksen + rekenkundig
    abstract.ts        SVG-figuren of bank-loader
    verbal.ts          bank-loader
    index.ts           registry: categorie -> generator
  data/
    verbal.json        gecureerde verbale items met level-tag
    abstract.json      getagde items (indien bank-aanpak)
  state/
    session.ts         huidige sessie, antwoorden, schatting
  ui/
    CategorySelect.tsx
    Question.tsx       toont item, vangt antwoord en tijd
    Results.tsx        score en grafiek van het niveauverloop
  App.tsx
```

### Datacontracten

Centrale types (richtlijn, pas aan naar eigen voorkeur):

```ts
type Category = 'numeric' | 'verbal' | 'abstract' | 'mixed';

interface Item {
  id: string;
  category: Category;
  level: number;          // 1..5, moeilijkheid van dit item
  prompt: string;         // vraagtekst
  render?: 'text' | 'svg';// hoe het item getoond wordt
  svg?: string;           // optioneel, voor abstracte items
  options: string[];      // meerkeuze-opties
  correctIndex: number;   // index van het juiste antwoord
  explanation?: string;   // uitleg, voor de oefenmodus
}

interface Answer {
  itemId: string;
  chosenIndex: number;
  correct: boolean;
  responseMs: number;
  levelAtTime: number;
}

interface SessionState {
  category: Category;
  estimate: number;       // continue niveau-schatting 1.0..5.0
  stepSize: number;       // huidige staircase-stap
  answers: Answer[];
  finished: boolean;
}
```

Kerninterfaces:

```ts
// levert een item op het gevraagde niveau voor de categorie
generate(category: Category, level: number): Item;

// berekent de nieuwe schatting na een antwoord
nextEstimate(state: SessionState, wasCorrect: boolean, responseMs: number): SessionState;
```

### Persistentie

Voor v1 niet vereist. Als je resultaten wilt bewaren in je eigen omgeving, kan dat met browseropslag. Let op: in Claude-artifacts werkt browseropslag niet; in een normale React-build wel.

## 5. UX-flow

1. Startscherm: kies categorie of gemengd.
2. Vraagscherm: vraagtekst of SVG, antwoordopties, voortgangsindicator, timer op de achtergrond.
3. Eindscherm: niveau-schatting, percentage goed, gemiddelde tijd, grafiek van het niveauverloop, knop om opnieuw te oefenen.

Twee modi:

- Oefenmodus: directe feedback en uitleg per vraag. Waardevol om van te leren.
- Testmodus: geen tussentijdse feedback, alleen een eindrapport. Lijkt op een echt assessment.

## 6. Bouwvolgorde

Volgorde sluit aan op de prioriteit inhoud eerst, dan adaptief.

1. Definieer de types en de numerieke generatoren met gevalideerde items op vijf niveaus. Schrijf unit-tests die controleren dat het juiste antwoord klopt en dat de moeilijkheid oploopt.
2. Bouw het staircase-algoritme los en test het met gesimuleerde kandidaten: een sterke kandidaat moet naar een hoog eindniveau convergeren, een zwakke naar een laag eindniveau.
3. Koppel generatie en algoritme in een minimale UI met een werkende test-loop.
4. Voeg de verbale bank en de abstracte items toe.
5. Werk de UI af en voeg de grafiek van het niveauverloop toe.
6. Optioneel: resultaatopslag en de IRT-upgrade.

## 7. Aandachtspunten

- Itemkwaliteit: elk gegenereerd item moet een eenduidig juist antwoord hebben. Beperk generatoren bewust om dubbelzinnige reeksen te voorkomen.
- Kalibratie: de niveaus 1 tot 5 zijn aannames tot er echte data is. Begin pragmatisch en stel later bij op basis van foutpercentages en responstijden.
- Niveaubereik: laat de staircase zelf het niveau vinden in plaats van vooraf te beperken. Het bereik 1 tot 5 dekt mbo 3-4 tot hbo ruim.
- Verbaal niet in de browser genereren: gebruik een gecureerde bank.

## 8. Definition of done voor v1

- Gebruiker kan een categorie kiezen en een complete sessie doorlopen.
- Numerieke items worden procedureel gegenereerd op vijf niveaus, met tests die de juistheid borgen.
- Het staircase-algoritme past het niveau aantoonbaar aan op basis van antwoorden.
- Verbale en abstracte items zijn beschikbaar via een bank of generatie.
- Eindscherm toont niveau-schatting, percentage goed, gemiddelde tijd en het niveauverloop.
- Oefenmodus met uitleg per vraag werkt.

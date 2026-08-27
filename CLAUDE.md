# CLAUDE.md

Projectcontext voor de adaptieve cognitieve oefentool. Lees ook `adaptieve-cognitieve-testtool.md` (oorspronkelijk bouwdocument).

> **Dit is een mobile-first applicatie.** Ontwerp en bouw elk scherm eerst voor telefoonbreedte: geen horizontaal scrollen, korte teksten die passen op smalle schermen, ruime tap-targets, en respecteer de safe-area. Test wijzigingen altijd op mobiele breedte voordat je ze als klaar beschouwt.

## Doel

Een web-app waarmee een gebruiker cognitieve capaciteitentests oefent. De test is **adaptief**: items worden moeilijker bij goede prestaties en makkelijker bij zwakke. Doelgroep: mbo 3-4 tot hbo. De gebruiker kiest zelf de categorie.

Twee zaken zijn extra belangrijk voor de opdrachtgever:
1. **Rijke feedback** naar de gebruiker (per vraag in oefenmodus, en in het eindrapport).
2. **Voortgang per gebruiker** bijhouden over sessies heen, inclusief of er progressie is.

Prioriteiten (hoog naar laag): inhoudelijk goede vragen → werkend adaptief algoritme → feedback & voortgang → verzorgde UI/UX → snelheid van opleveren.

## Scope v1

Categorieën (toegespitst op de focus van de opdrachtgever):
- **Cijferpatronen** — procedureel gegenereerd, 6 niveaus.
- **Letterpatronen** — procedureel gegenereerd, 6 niveaus (A-Z ↔ 1-26, modulo 26).
- **Woordrelaties** — gecureerde Nederlandse itembank met niveau-label, 170 enkele analogieën ("A : B = C : ?") en 40 dubbele ("? : B = C : ?"), zwaartepunt op niveau 3-6.
- **Gemengd** — wisselt de drie categorieën af.

### Vraagvormen

Binnen een categorie komen meerdere vormen voor, gelijk aan wat de echte cognitieve capaciteitentest van de politie bevat. De vorm staat in `Item.form` (`ItemForm` in `engine/types.ts`) en bepaalt welke aanpak-hulp de gebruiker krijgt (`generators/hints.ts` is per vorm, niet per categorie).

| Vorm | Categorie | Niveaus | Aandeel |
|---|---|---|---|
| `numericSeries` | cijfers | 1-6 | rest |
| `numericGrid` | cijfers | 3-6 | 1 op 10 |
| `numericOddOne` | cijfers | 3-6 | 1 op 10 |
| `letterSeries` | letters | 1-6 | rest |
| `letterOddOne` | letters | 3-6 | 1 op 5 |
| `verbalSingle` | woorden | 1-6 | rest |
| `verbalDouble` | woorden | 3-6 | 0% op 1-2, 25% op 3, 40% op 4, 50% op 5-6 |

Reeksen blijven bewust de hoofdmoot: de nieuwe vormen zijn variatie, geen vervanging.

- **Raster** (`numericGrid`): 3x3 getallen waarvan een vakje leeg is; de regel loopt per rij of per kolom. Het raster zit in `Item.grid` (`{ cols, cells }`, het gevraagde vakje is `'?'`) en wordt door `ui/Question.tsx` als CSS-grid gerenderd, niet als tekst in de prompt. `ui/speech.ts` leest het rij voor rij voor.
- **Welke hoort niet in de rij** (`numericOddOne`, `letterOddOne`): een rij die bijna helemaal een regel volgt met precies een bedorven term; de opties zijn getoonde termen. Zie "Eenduidigheid bij odd-one-out" hieronder.
- **Dubbele analogie** (`verbalDouble`): `? : B = C : ?`, kiezen uit vier woordparen. Zwaarder dan de enkele vorm omdat de relatie niet af te lezen is: je moet hem uit de twee gegeven woorden en de kandidaatparen samen afleiden. Eigen bank `data/verbalDouble.json`, geen niveau 1-2.

### Tijdsdruk (alleen testmodus)

De echte politietest is tijdgebonden: de instructies mag je rustig lezen, de opgaven niet, en de tijd per vraag loopt mee met de moeilijkheid. `engine/timing.ts` bootst dat na met `timeLimitMs(item)`: een basis van 30 seconden, 8 seconden erbij per niveau, en 10 seconden extra voor de vormen met veel leeswerk (raster, odd-one-out, dubbele analogie). Zonder die laatste toeslag straft de klok het formaat van de opgave in plaats van de moeilijkheid ervan.

- **Alleen in testmodus.** In oefenmodus wil je nadenken, hulp kunnen vragen en de uitleg lezen; tijdsdruk zit dat leren in de weg.
- Loopt de tijd af, dan telt de vraag als fout (`NO_ANSWER = -1`) en gaat de sessie door. Die index hoort bij geen enkele optie, dus het adaptieve algoritme en de score hoeven er niets van te weten.
- Het aftellen zit in `ui/TimeBar.tsx` zelf, niet in de sessie: anders hertekende het hele vraagscherm vier keer per seconde. De klok loopt op `performance.now()` en niet op het aantal ticks, want een tab op de achtergrond krijgt er minder.
- Het introscherm kondigt de limiet aan. Een klok die pas bij de eerste vraag blijkt te lopen, overvalt de gebruiker.

Buiten v1 (architectureel wel mogelijk gehouden): abstracte/figuurreeksen, rekenkundig redeneren, IRT/CAT-kalibratie, backend-sync.

## Tech stack

- **Vite + React + TypeScript**, package manager **NPM**.
- **Vitest** voor unit-tests.
- Lichte, eigen CSS. Geen zware UI-library.
- Volledig **client-side**, geen backend. Persistentie via **browser `localStorage`**.
- De dev-server draait op **poort 5199**, niet op de Vite-standaard 5173: die poort is op deze machine van een andere applicatie. Staat vast in `vite.config.ts` met `strictPort`, dus `npm run dev` faalt zichtbaar als 5199 bezet is in plaats van stilletjes uit te wijken. Gebruik ook bij visuele controles nooit 5173.

## Architectuur

```
src/
  engine/
    types.ts        Category, Item, Answer, SessionState, profielen/historie types
    adaptive.ts     staircase: nextEstimate, niveau-mapping, stopcriterium
    timing.ts       tijdslimiet per vraag (alleen testmodus)
    assessment.ts   beoordeling van de voortgang uit de sessiehistorie
  generators/
    numeric.ts      cijferpatronen-generator (niveau 1..6)
    letters.ts      letterpatronen-generator (niveau 1..6)
    verbal.ts       woordrelaties bank-loader
    index.ts        registry: categorie -> generate(level)
  data/
    verbal.json       gecureerde enkele woordrelaties met niveau-tag
    verbalDouble.json gecureerde dubbele analogieen (niveau 3..6)
    whatsNew.ts       changelog voor de gebruiker + APP_VERSION
  state/
    useSession.ts   actieve sessie: schatting, antwoorden, voortgang
    route.ts        welk scherm en welke modus staan in de URL (hash-routing)
  storage/
    profiles.ts     profielen aanmaken/kiezen/verwijderen (localStorage)
    appVersion.ts   onthoudt welke versie al gezien is ("Wat is nieuw?")
    history.ts      afgeronde sessies per profiel opslaan/lezen
    transfer.ts     voortgang exporteren/importeren als JSON-bestand
  ui/
    ProfileSelect.tsx
    CategorySelect.tsx
    Question.tsx    toont item, vangt antwoord en responstijd
    Results.tsx     eindrapport: schatting, % goed, gem. tijd, feedback
    Progress.tsx    voortgang per categorie over sessies
    AssessmentPanel.tsx  beoordeling: sterke punten, verbeterpunten, volgende stap
    WhatsNew.tsx    kaart met de wijzigingen van een nieuwe versie
    LevelChart.tsx  grafiek van het niveauverloop
    ItemPrompt.tsx    opgave van een item: vraagtekst, reeks of raster
    LevelUpToast.tsx  korte felicitatie bij een hoger niveau
    TimeBar.tsx       aflopende tijdbalk per vraag (testmodus)
    VoicePicker.tsx   keuze van de voorleesstem (in het profielpaneel)
    speech.ts         tekst-naar-spraak: stemkeuze, voorlezen, raster uitspreken
  App.tsx
  main.tsx
  __tests__/        numeric, letters, adaptive (Vitest)
```

## Kerncontracten

```ts
type Category = 'numeric' | 'letters' | 'verbal' | 'mixed';

type ItemForm =
  | 'numericSeries' | 'numericGrid' | 'numericOddOne'
  | 'letterSeries'  | 'letterOddOne'
  | 'verbalSingle'  | 'verbalDouble';

interface Hint {
  strategy: string;       // aanpak per vraagvorm, verklapt de familie niet
  step: string;           // eerste concrete denkstap voor dit item
}

interface ItemGrid {
  cols: number;           // aantal kolommen; rijen volgen uit cells.length
  cells: string[];        // rij voor rij; het gevraagde vakje bevat '?'
}

interface Item {
  id: string;
  category: Category;
  form: ItemForm;
  level: number;          // 1..6
  prompt: string;
  grid?: ItemGrid;        // alleen bij matrix-items; prompt bevat dan geen reeks
  options: string[];
  correctIndex: number;
  explanation: string;    // gebruikt voor feedback in oefenmodus
  hint: Hint;             // getrapte hulp: { strategy, step }
}

// levert een item op het gevraagde niveau
generate(category: Category, level: number): Item;

// nieuwe schatting na een antwoord (staircase)
nextEstimate(state: SessionState, wasCorrect: boolean, responseMs: number): SessionState;
```

## Wetenschappelijke onderbouwing

Houd methodes wetenschappelijk verantwoord, maar simpel in gebruik (de complexiteit zit onder de motorkap):
- **Adaptief**: weighted up/down staircase (Kaernbach 1991; Levitt 1971 transformed up-down) die convergeert naar een vast doel-slagingspercentage (~70-75%). Dit is de standaard psychofysische methode om een niveau te schatten en houdt de kandidaat in de productieve zone. IRT/CAT is de gedocumenteerde latere upgrade (gouden standaard, vereist kalibratiedata).
- **Itemtypes**: cijfer-/letterreeksen en analogieën zijn klassieke maten voor fluïde intelligentie (Gf), zoals in Raven-achtige en numerieke redeneertests.
- **Feedback**: directe, specifieke, verklarende feedback in oefenmodus volgt formatieve-feedbackprincipes (Hattie & Timperley 2007; Shute 2008). Voortgangsfeedback toont groei ter ondersteuning van motivatie.

## Adaptief algoritme (weighted up/down staircase)

- Continue schatting 1.0..6.0, start 2.5, beginstap 1.0 (schaalt mee met de lengte van de schaal; met een kleinere stap kost het te veel vragen om de bovenkant te bereiken).
- Asymmetrische stappen die convergeren naar ~75% goed: opstap kleiner dan neerstap (Kaernbach: up/down-verhouding = (1-p_target)/p_target). Goed → +up_step, fout → −down_step (geclampt 1..6).
- Stapgrootte halveert bij elke richtingsomkering, ondergrens ~0.1, zodat de schatting inschommelt rond het werkelijke niveau.
- Optioneel: snel+goed iets grotere opstap (responstijd-weging).
- Generatie-niveau = afgeronde schatting (1..6).
- Stop: altijd na 15 items. Er is bewust geen vroegtijdige stop op "stabiele schatting" (stap op ondergrens): de stap zakt al na drie richtingsomkeringen naar de ondergrens, waardoor vrijwel elke sessie precies bij vraag 10 afbrak terwijl de teller "van 15" toonde.
- Eindscore: schatting, % goed, gemiddelde responstijd.

## Feedback & voortgang

- **Oefenmodus**: per vraag direct goed/fout + uitleg, plus een hulpknop tijdens het nadenken (zie hieronder).
- **Testmodus**: geen tussentijdse feedback, alleen eindrapport.
- **Eindrapport**: schatting, % goed, gem. tijd, niveauverloop-grafiek + tekstuele duiding.
- **Voortgang**: per profiel en per categorie de eindschatting over de tijd; trend t.o.v. vorige sessies (omhoog/stabiel/omlaag). Elke sessie slaat datum en tijd op (`completedAt`).
- **Beoordeling** (`engine/assessment.ts`): de knop "Beoordeel mijn voortgang" op het voortgangsscherm geeft een korte analyse: een samenvattende zin, sterke punten, verbeterpunten en een concrete volgende stap. De regels draaien op wat er per sessie bewaard is (eindschatting, % goed, gemiddelde responstijd, langste reeks, datum) en zijn bewust conservatief: een verschil kleiner dan 0.3 niveau is ruis, en pas vanaf vier sessies in een categorie wordt er iets over een trend gezegd. Er gaat geen data de deur uit; alles wordt lokaal berekend. Per lijst maximaal vier punten, want meer leest niemand op een telefoon.
- **Export/import**: voortgang als JSON-bestand downloaden en weer importeren (versiecheck op het schema), zodat data niet verloren gaat bij het wissen van browserdata of bij wisselen van apparaat.

## Getrapte hulp tijdens het oefenen

Elk `Item` heeft een `hint` met twee tredes, opvraagbaar via de hulpknop en alleen in oefenmodus (de testmodus geeft per definitie geen tussentijdse ondersteuning):

1. **`strategy`** - hoe pak je dit soort vraag aan. Deze tekst staat per categorie vast in `generators/hints.ts`. Bewust niet per strategie-familie: zou hij verklappen dat het om een verweven reeks gaat, dan was de vraag al half beantwoord. De tekst noemt daarom alle sporen die je kunt volgen.
2. **`step`** - de eerste concrete denkstap voor juist dit item, geleverd door de generator die het patroon kent (bijvoorbeeld "de verschillen zijn +4, +4, +4"). De laatste stap blijft altijd aan de gebruiker.

Regels die de tests bewaken (`__tests__/hints.test.ts`):
- Geen van beide teksten rekent het antwoord voor (nooit `= <antwoord>`).
- De `step` is niet simpelweg de `explanation` van het antwoord.
- Bij woordrelaties mag geen enkel antwoord uit de bank als heel woord in de hulptekst voorkomen. Let hierop bij het formuleren: gewone voorzetsels zijn riskant, want "bij" en "hand" zijn ook antwoorden in de bank.

**Score**: hulp gevraagd betekent halve punten voor dat item (`HINT_PENALTY` in `engine/scoring.ts`). De reeks/combo blijft wel staan, zodat hulp vragen niet zo duur wordt dat iemand er van afziet als hij vastloopt. Zonder aftrek zou hint-spammen het klassement en het persoonlijk record waardeloos maken.

## Gamification (spelgevoel)

- **Score** (`engine/scoring.ts`): per goed antwoord punten uit een paar variaties: niveau-bonus (moeilijker = meer), snelheidsbonus (sneller = meer, tijd-variant) en een reeks/combo-multiplier (opeenvolgende goede antwoorden, gedekt op 2x). Fout = 0 punten en de reeks breekt.
- **High score** per profiel per categorie, met een "Nieuw record!"-melding op het eindscherm.
- **"Wist je dat..."** (`data/facts.ts`): motiverende hersenfeiten met uitleg waarom oefenen helpt. Eenmaal halverwege de sessie en op het eindscherm.
- De score staat los van de niveau-schatting (`SessionState`); het beinvloedt de adaptiviteit niet.

## Cijferpatronen: strategieen

De numerieke generator gebruikt per niveau meerdere strategieen door elkaar, didactisch gegradeerd (zie `generators/numeric.ts`, `NumericFamily`):
- N1: constante stap (+ en -), reeks van ronde tientallen (op en neer), verdubbelen.
- N2: grotere constante stap (kleine en grotere startgetallen), dalende reeks die door nul zakt, reeks van kwartjes (25/50), constante factor (x2/x3), halveren.
- N3: veranderende stap (oplopend/aflopend), delen (:2/:3), stijgende reeks die onder nul begint, grotere ronde getallen, twee verweven reeksen, verweven reeks met een constante tweede reeks, verweven reeks die door nul zakt, afwisselend +a en -b.
- N4: afwisselend x en + of x en -, afwisselend x4 en :2, recursief (vorige x m + c, c mag negatief), grotere factor, stap die door nul kantelt, stijgende reeks vanaf een negatief startgetal, verweven met een dalende tweede reeks, zigzag die naar negatieve getallen zakt, priemgetallen. Priemgetallen en de verweven reeks met grotere getallen zijn herkenwerk in plaats van redeneerwerk en horen daarom hier thuis, niet op N5.
- N5: Fibonacci, negatieve factor (wisselend teken), afwisselend x en : met grotere factoren, zwaardere recursie, een verweven reeks waarvan de eerste reeks verdubbelt en de tweede daalt, een reeks waarvan de verschillen verdubbelen, een cyclus van drie bewerkingen die elkaar afwisselen (`opcycle3`, zeven termen zodat twee volle rondes zichtbaar zijn), een stap die van de plek in de reeks afhangt (`posstep`, stap n = k x n x n), plus machtreeksen (kwadraten, derdemachten, machten van 2 met +/-1).
- N6: som van de drie voorgaande (tribonacci), vorige min de term daarvoor (zakt door nul, herhaalt pas na zes termen), producten van twee opeenvolgende getallen, drie verweven reeksen, machten van 3 met verschuiving, verschillen die verdrievoudigen, recursie met grotere factor en constante, `opcycle3` met een grotere factor, en een reeks waarvan pas het derde verschil constant is (`thirdorder`).

De keuze voor `opcycle3`, `posstep` en `thirdorder` op de bovenkant volgt de literatuur over itemmoeilijkheid bij cijferreeksen (zie "Wetenschappelijke onderbouwing"): het aantal regels en het aantal bewerkingen per stap zijn de sterkste voorspellers. De variant `a_n = a_(n-1) + n x k` is bewust weggelaten: die geeft een constant tweede verschil en is dus dezelfde opgave als `arithmetic2`.

**Verweven reeksen: welke reeks gevraagd wordt, wisselt.** Bij `interwoven`, `interwoven3` en `interwovengeo` hoorde het vraagteken altijd bij de eerste reeks. Dat is een exploit: wie hem doorheeft hoeft de tweede reeks nooit te lezen. De gevraagde reeks wordt nu geloot en de rij wordt daarvoor een of twee termen langer, zodat de positie van het vraagteken eenduidig bepaalt bij welke reeks het hoort (en de test dat onafhankelijk kan afleiden). Uitzondering: de N3-variant met een constante tweede reeks blijft reeks A, anders is de vraag "schrijf hetzelfde getal nog eens op".

**Raster** (`numericGrid`, N3-N6, 3x3): N3 rijregel met een bewerking (som, verschil), N4 kolomregel (bovenste twee vermenigvuldigd geeft het onderste; dit is de vorm uit de politie-oefensets), N5 rijregel met twee bewerkingen ((a+b) x k, a x k - b), N6 rij- en kolomregel tegelijk of een regel over de diagonaal. Het lege vakje varieert over alle negen plekken. Drie identieke lijnen worden geweigerd, want dan is het antwoord over te schrijven.

**Variatie in getallen** is bewust breed: naast kleine reeksen komen op elk niveau ook reeksen met tientallen of honderdtallen voorbij (ronde getallen, negatieve startgetallen). `__tests__/numeric.test.ts` bewaakt dat elk niveau zowel kleine als grotere getallen oplevert, zodat opgaven niet altijd hetzelfde beeld hebben.

Machtreeksen zijn de zwaarste vorm en komen daarom bewust weinig voor: de drie machtfamilies delen een plek in de niveau-5-lijst, dus samen ongeveer een op de zeven vragen. Op niveau 5 blijven ze klein van getal (lage startexponenten, kleine verschuiving, basis 2), zodat de vraag om patroonherkenning gaat en niet om hoofdrekenen. Machten van 3 lopen binnen vijf termen richting 729 en staan daarom alleen op niveau 6.

Niveau 1 en 2 blijven bewust toegankelijk als instap (mbo 3-4); de variatie zit daar in het uiterlijk van de reeks, niet in de zwaarte. Vanaf niveau 3 lopen zowel het aantal families als de zwaarte op.

**Negatieve getallen** komen vanaf niveau 2 voor en op elk niveau daarboven, didactisch opgebouwd: een dalende reeks die door nul zakt (N2), een verweven reeks die door nul zakt en een stijgende reeks vanaf een negatief startgetal (N3, ook op N4 met grotere stappen), een zigzag naar negatief en negatieve constanten (N4), een negatieve factor met wisselend teken (N5) en een reeks die door nul zakt en zich pas na zes termen herhaalt (N6). Elk niveau vanaf 2 heeft minstens een strategie die gegarandeerd negatieve getallen oplevert; `__tests__/numeric.test.ts` bewaakt dat.

Elke familie heeft een onafhankelijke verificatie in `__tests__/numeric.test.ts` zodat het juiste antwoord eenduidig is.

## Letterpatronen: strategieen

Ook de letter-generator werkt met families (zie `generators/letters.ts`, `LetterFamily`), zodat dezelfde puzzelvorm niet steeds terugkomt:
- L1: constante stap vooruit/achteruit, letterparen die opschuiven (AB, DE, GH, ...).
- L2: grotere constante stap, oplopende stap, twee afwisselende stappen.
- L3: veranderende stap (groter/kleiner), grotere afwisselende stappen, twee verweven reeksen, letterparen met grotere sprong.
- L4: sterk oplopende stap, zigzag (vooruit/achteruit), verweven met een teruglopende reeks, reeks vanaf het begin verweven met een reeks vanaf het eind van het alfabet, paren waarvan de letters uit elkaar lopen.
- L5: stap volgens Fibonacci, drie verweven reeksen, zigzag met netto achterwaartse drift, sterk oplopende stap, verweving en spiegeling met grotere stappen, een cyclus van drie sprongen (`cycleThree`), en een sprong die van de plek in de reeks afhangt en van richting wisselt (`positionStep`).
- L6: plaatsen in het alfabet die opeenvolgende priemgetallen zijn, sprong die verdubbelt, drie verweven reeksen met grotere stappen waarvan er een terugloopt, fibonacci-stap met grotere beginstappen, paren waarvan de eerste letter versnelt en de tweede een vaste stap houdt, spiegeling met grote stappen, `cycleThree` en `positionStep` met grotere waarden, plus `reverseAlphabet`.

`reverseAlphabet` telt de plaatsen vanaf de achterkant (Z=1 ... A=26) en zet daar opeenvolgende priemgetallen neer. Bewust waardegebonden en niet een nette rekenregel: bij een rekenregel vanaf Z is de reeks net zo goed vanaf A op te lossen en voegt de omkering niets toe. De uitleg noemt de telrichting met een voorbeeld.

Net als bij de cijferpatronen wisselt bij `interwovenPair`, `interwovenTriple` en `mirrorPair` welke reeks gevraagd wordt; de gevraagde reeks toont altijd drie letters, dus de lengte van de rij bepaalt eenduidig welke reeks het vraagteken voortzet.

Een reeks wordt waar mogelijk zo in het alfabet gelegd dat er geen omslag van Z naar A nodig is. Op niveau 1 en 2 past dat altijd; komt een omslag op hogere niveaus toch voor, dan wijst de uitleg de gebruiker erop.

## Eenduidigheid bij odd-one-out

"Welke hoort niet in de rij" is de vorm waar dubbelzinnigheid het snelst toeslaat, dus die wordt in de **generator** afgedwongen en niet alleen in de test. Een kandidaat-rij wordt tegen alle bekende lezingen gehouden; hij gaat pas de deur uit als de rij zelf geen regel volgt en er precies **een** plaats is waarvan vervanging hem kloppend maakt. Anders opnieuw loten, met een harde poging-limiet en een deterministische terugval. De controle rekent bij letters modulo 26, zodat een letter die alleen via de Z-naar-A-omslag zou kloppen ook wordt betrapt.

Twee bevindingen uit die controle zitten in de code verankerd:
- Een rij met een **vaste stap van zeven letters** is inherent dubbelzinnig: de drie letters op de oneven plaatsen zijn met een enkele vervanging altijd kloppend te maken als "twee verweven reeksen", dus er zijn dan twee aanwijsbare letters. Die basis is daarom negen letters lang.
- Bij cijfers geldt hetzelfde voor verweven reeksen met drie termen per reeks: `oddInterwoven` gebruikt daarom vier termen per reeks (rij van 8).

De bedorven term wijkt nooit met 1 af (dat leest te vaak als "de stap verandert daar") en staat nooit op de eerste twee of de laatste plaats.

## Itemkwaliteit (belangrijk)

- Elk item heeft **exact één** eenduidig juist antwoord. Houd generatoren bewust beperkt om dubbelzinnige reeksen te voorkomen.
- Voor elke generator een **Vitest-test** die controleert dat het opgegeven juiste antwoord echt klopt en dat geen enkele afleider ook een geldige voortzetting is. De verificatie is **onafhankelijk**: hij herberekent het antwoord met eigen code, niet met de generatorcode.
- Woordrelaties niet in de browser genereren: gebruik de gecureerde, handmatig gecontroleerde bank.
- Bij dubbele analogieën zijn de afleiders altijd van drie soorten: een paar waarvan de linkerhelft klopt maar de rechter niet, een paar waarvan de rechterhelft klopt maar de linker niet, en een inhoudelijk verwant paar in een andere relatie.

## Bouwvolgorde

1. `types` + numerieke en letter-generatoren met validatie-tests.
2. Staircase los bouwen + simulatie-tests (sterke kandidaat → hoog, zwakke → laag).
3. Generatie + algoritme koppelen in een minimale UI-loop.
4. Woordrelaties-bank toevoegen.
5. Profielen + historie + voortgang-scherm.
6. UI afwerken + niveauverloop-grafiek.

## PWA (telefoon)

De app is een installeerbare PWA via `vite-plugin-pwa` (zie `vite.config.ts`):
- Manifest met naam, iconen (gegenereerd uit `public/icon.svg` met `@vite-pwa/assets-generator`), `display: standalone`, thema-kleur.
- Service worker (`registerType: 'autoUpdate'`) cachet de app-shell, dus de tool werkt volledig offline na de eerste keer laden.
- iOS-meta (`apple-touch-icon`, `apple-mobile-web-app-*`) in `index.html`.
- Installeren werkt alleen via `https` (of `localhost`). Host de `dist/`-output op een statische https-host en kies op de telefoon "Zet op beginscherm".
- Icons opnieuw genereren na het wijzigen van `public/icon.svg`: `npx pwa-assets-generator --preset minimal-2023 public/icon.svg`.

## Navigatie: het scherm staat in de URL

`state/route.ts` vertaalt tussen de URL en het scherm. **Hash-routing**, want de app draait als PWA onder een subpad op GitHub Pages en dan werkt diep linken zonder serverconfiguratie. Categorieen staan met hun Nederlandse naam in de URL: die is voor de gebruiker, niet voor de code.

```
#/profiel
#/kiezen
#/start/<categorie>            intro, oefenmodus
#/start/<categorie>/test       intro, testmodus
#/sessie/<categorie>           lopende sessie, oefenmodus
#/sessie/<categorie>/test      lopende sessie, testmodus
#/resultaat
#/voortgang
#/ranglijst
```

- **De modus staat in de URL**, naast de categorie. Zonder dat werd een herlaad midden in een test stilletjes een oefensessie: hulp beschikbaar, geen tijdslimiet, en geen melding daarvan. `App.tsx` leidt de modus daarom uit de route af en houdt er geen eigen state meer voor bij.
- **Oefenen krijgt bewust geen eigen segment.** Dat is de modus waarin de meeste mensen zitten en een korte URL is prettiger; alleen de test wijkt af en zegt dat dan ook. De lopende sessie heet `sessie` en niet `oefenen`, want die route draagt beide modi en `#/oefenen/<cat>/test` spreekt zichzelf tegen.
- `parseHash` blijft streng: een onbekend derde segment (`#/start/cijferpatronen/onzin`) is net zo ongeldig als een onbekende categorie en valt terug op `#/profiel`. Liever het profielscherm dan iemand in de verkeerde modus zetten.

- De pure functies (`buildHash`, `parseHash`, `resolveRoute`) staan los van de browserkoppeling (`useHash`, `navigate`, `replaceHash`), zodat ze zonder DOM te testen zijn.
- **Het profiel staat bewust niet in de URL.** Een profiel-id in de adresbalk is een deelbare link naar andermans voortgang, en profielen zijn hier niet met een wachtwoord gescheiden. Het laatst gekozen profiel wordt lokaal onthouden (eigen `localStorage`-sleutel, net als de geziene versie), anders zou elke herlaad alsnog op het profielscherm eindigen. Een verse start zonder hash blijft op `#/profiel`: op een gedeeld apparaat zeg je eerst wie je bent.
- **Niet elk scherm is herstelbaar.** De opgaven worden procedureel gegenereerd, dus een lopende sessie overleeft een herlaad niet. `#/sessie/<cat>` valt daarom terug op `#/start/<cat>` en `#/resultaat` zonder resultaat op `#/kiezen`. De terugval houdt de modus vast: `#/sessie/<cat>/test` komt uit op `#/start/<cat>/test`, niet op de oefenvariant. Dat een sessie zelf bewaard blijft is bewust buiten scope gehouden.
- Gebruikersnavigatie gebruikt `navigate` (nieuwe geschiedenis-entry, dus de terugknop werkt); terugval-redirects gebruiken `location.replace`, anders ontstaat een lus waarin terug niets doet.

## Voorlezen

`ui/speech.ts` kiest **actief** een stem. Zonder dat krijg je de standaardstem van het besturingssysteem, en dat is meestal de oudste en meest robotachtige die er is.

- De Web Speech API heeft geen kwaliteitsveld, dus de rangschikking leidt kwaliteit af uit de naam. "Google Nederlands" staat bovenaan **op expliciet verzoek van de opdrachtgever**, niet op basis van een meting; niet "corrigeren" naar Premium/Enhanced. Die blijven de terugval op Apple-toestellen, waar de Google-stem niet bestaat.
- Bewust **niet** gefilterd op `localService`: dat is geen kwaliteitsvlag, en juist de remote Google-stem klinkt op Chrome beter. Kanttekening: bij een remote stem gaat de voorgelezen tekst naar de leverancier. Acceptabel omdat het om oefenopgaven gaat, niet om persoonsgegevens.
- `getVoices()` is bij de eerste aanroep vaak leeg (de lijst komt asynchroon, op iOS pas na een interactie). Daarom een cache met een `voiceschanged`-listener en een abonnement voor de UI.
- De stem hoort **bij het profiel** (`Profile.voiceURI`): twee mensen op hetzelfde toestel mogen een andere stem willen. Bestaat die stem na een import op een ander apparaat niet, dan valt `resolveVoice` terug op de automatische keuze.
- `App.tsx` geeft de stem van het actieve profiel eenmalig door met `setActiveVoice`. Bewust geen prop: de voorleesknop staat op een stuk of tien plekken en die zouden allemaal een stem moeten doorgeven zonder er iets mee te doen.

## Versie en "Wat is nieuw?"

`data/whatsNew.ts` is de changelog voor de gebruiker. De nieuwste release staat bovenaan en bepaalt tegelijk `APP_VERSION`; bij elke inhoudelijke wijziging komt daar een blok bovenop.

**De lezers zijn geen IT-ers.** Schrijf uitsluitend wat er voor hen verandert, in gewone taal en vanuit de gebruiker ("je kunt nu ...", niet "de generator ondersteunt nu ..."):
- Alleen functionele wijzigingen. Een technische verbetering die je in de app niet merkt, hoort er niet in.
- Geen vakjargon. Knop, scherm en niveau mogen; woorden als raster, reeks of regel alleen als de gebruiker ze zelf in de app ziet staan.
- Niet uitleggen hoe iets werkt of hoe het vroeger was. Beschrijf kort de nieuwe situatie.
- Een punt is een of twee zinnen. Wordt het langer, dan zit er waarschijnlijk techniek in die eruit kan.

Bij het laden toont de app eenmalig een kaart met alles wat na de laatst geziene versie is bijgekomen. De geziene versie staat in een eigen `localStorage`-sleutel (`storage/appVersion.ts`), bewust los van de profielen: het hoort bij het apparaat, niet bij de gebruiker, en mag niet meeliften op de export/import van voortgang. Regels:
- Iemand die de app voor het eerst opent (geen profielen, geen geziene versie) krijgt geen changelog te zien.
- Is de opgeslagen versie onbekend, dan toont de app alleen de nieuwste release; een lange lijst met oude wijzigingen leest toch niemand.
- De kaart is niet blokkerend: hij staat boven het scherm en verdwijnt met "Duidelijk".
- De pagina springt naar boven zodra de kaart verschijnt. Browsers herstellen bij een herlaad de vorige scrollpositie, en dan hangt de kaart ongezien boven beeld. Springen zonder animatie: de gebruiker heeft er niet zelf om gevraagd.
- De kaart is ook zelf op te vragen met de knop "Wat is nieuw?" onderaan `ui/ProfileSelect.tsx`. Automatisch toont hij alles wat na de laatst geziene versie kwam; zelf opgevraagd begint hij bij de nieuwste release en zit de rest van de historie eronder. `App.tsx` bepaalt dat onderscheid (`cardReleases`).
- Onder de nieuwe punten zit de rest van de changelog uitklapbaar weggevouwen ("Bekijk oudere versies", `olderReleases()`), zodat iemand die versies heeft overgeslagen alsnog terug kan lezen zonder dat de kaart standaard een lap tekst wordt. Wat de kaart toont plus het uitklapbare deel is samen altijd precies de hele historie; `__tests__/whatsNew.test.ts` bewaakt dat.

Dit staat los van de PWA-updatemelding (`ui/PwaUpdater.tsx`), die alleen meldt dat er een nieuwe versie klaarstaat om te laden.

## Conventies

- Maven/Gradle n.v.t. (frontend). Build: **Vite**, package manager: **NPM**.
- Geen em-dashes in UI-teksten of documentatie.
- UI-teksten en items in het **Nederlands**.
- Houd functies klein en leesbaar; bundel lange parameterlijsten in een object/type.
- **Mobile-first**: alles moet goed werken op telefoonbreedte (geen horizontaal scrollen, ruime tap-targets, safe-area respecteren).
- **Iconen**: gebruik `lucide-react` (de iconenset van shadcn). Geen emoji of zelfgemaakte SVG-iconen.
- **Knoppen standaard = icoon + tekst** (klasse `.btn`, omlijnd). Gebruik icoon-zonder-tekst (`.icon-button`) alleen voor compacte, herhaalde rij-acties (zoals verwijderen) waar tekst de layout zou verdringen; geef die dan altijd een `aria-label`.
- Houd label-teksten van knoppen en keuze-opties die naast elkaar staan **ongeveer even lang**, zodat de layout in balans blijft.
- **Knoppen onderaan een scherm centreren** (footer-acties horizontaal gecentreerd, klasse `.footer-actions`).

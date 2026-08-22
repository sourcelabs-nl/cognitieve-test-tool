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
- **Cijferpatronen** — procedureel gegenereerd, 5 niveaus.
- **Letterpatronen** — procedureel gegenereerd, 5 niveaus (A-Z ↔ 1-26, modulo 26).
- **Woordrelaties** — gecureerde Nederlandse itembank met niveau-label (analogieën "A : B = C : ?"), ruim 150 items met het zwaartepunt op niveau 3-5.
- **Gemengd** — wisselt de drie categorieën af.

Buiten v1 (architectureel wel mogelijk gehouden): abstracte/figuurreeksen, rekenkundig redeneren, IRT/CAT-kalibratie, backend-sync.

## Tech stack

- **Vite + React + TypeScript**, package manager **NPM**.
- **Vitest** voor unit-tests.
- Lichte, eigen CSS. Geen zware UI-library.
- Volledig **client-side**, geen backend. Persistentie via **browser `localStorage`**.

## Architectuur

```
src/
  engine/
    types.ts        Category, Item, Answer, SessionState, profielen/historie types
    adaptive.ts     staircase: nextEstimate, niveau-mapping, stopcriterium
  generators/
    numeric.ts      cijferpatronen-generator (niveau 1..5)
    letters.ts      letterpatronen-generator (niveau 1..5)
    verbal.ts       woordrelaties bank-loader
    index.ts        registry: categorie -> generate(level)
  data/
    verbal.json     gecureerde woordrelaties met niveau-tag
  state/
    useSession.ts   actieve sessie: schatting, antwoorden, voortgang
  storage/
    profiles.ts     profielen aanmaken/kiezen/verwijderen (localStorage)
    history.ts      afgeronde sessies per profiel opslaan/lezen
    transfer.ts     voortgang exporteren/importeren als JSON-bestand
  ui/
    ProfileSelect.tsx
    CategorySelect.tsx
    Question.tsx    toont item, vangt antwoord en responstijd
    Results.tsx     eindrapport: schatting, % goed, gem. tijd, feedback
    Progress.tsx    voortgang per categorie over sessies
    LevelChart.tsx  grafiek van het niveauverloop
  App.tsx
  main.tsx
  __tests__/        numeric, letters, adaptive (Vitest)
```

## Kerncontracten

```ts
type Category = 'numeric' | 'letters' | 'verbal' | 'mixed';

interface Hint {
  strategy: string;       // aanpak per categorie, verklapt de familie niet
  step: string;           // eerste concrete denkstap voor dit item
}

interface Item {
  id: string;
  category: Category;
  level: number;          // 1..5
  prompt: string;
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

- Continue schatting 1.0..5.0, start 2.5.
- Asymmetrische stappen die convergeren naar ~75% goed: opstap kleiner dan neerstap (Kaernbach: up/down-verhouding = (1-p_target)/p_target). Goed → +up_step, fout → −down_step (geclampt 1..5).
- Stapgrootte halveert bij elke richtingsomkering, ondergrens ~0.1, zodat de schatting inschommelt rond het werkelijke niveau.
- Optioneel: snel+goed iets grotere opstap (responstijd-weging).
- Generatie-niveau = afgeronde schatting (1..5).
- Stop: 15 items óf stabiele schatting (stap op ondergrens).
- Eindscore: schatting, % goed, gemiddelde responstijd.

## Feedback & voortgang

- **Oefenmodus**: per vraag direct goed/fout + uitleg, plus een hulpknop tijdens het nadenken (zie hieronder).
- **Testmodus**: geen tussentijdse feedback, alleen eindrapport.
- **Eindrapport**: schatting, % goed, gem. tijd, niveauverloop-grafiek + tekstuele duiding.
- **Voortgang**: per profiel en per categorie de eindschatting over de tijd; trend t.o.v. vorige sessies (omhoog/stabiel/omlaag). Elke sessie slaat datum en tijd op (`completedAt`).
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
- N1: constante stap (+ en -), verdubbelen.
- N2: grotere constante stap, dalende reeks die door nul zakt, constante factor (x2/x3), halveren.
- N3: veranderende stap (oplopend/aflopend), delen (:2/:3), twee verweven reeksen, verweven reeks die door nul zakt, afwisselend +a en -b.
- N4: afwisselend x en + of x en -, recursief (vorige x m + c, c mag negatief), grotere factor, stap die door nul kantelt, verweven met een dalende tweede reeks, zigzag die naar negatieve getallen zakt.
- N5: kwadraten en derdemachten (met vaste verschuiving), machten van 2/3 (+/-1), Fibonacci, priemgetallen, negatieve factor (wisselend teken), zwaardere recursie en verweving.

Niveau 1 en 2 blijven bewust toegankelijk als instap (mbo 3-4); de variatie zit daar in het uiterlijk van de reeks, niet in de zwaarte. Vanaf niveau 3 lopen zowel het aantal families als de zwaarte op.

**Negatieve getallen** komen vanaf niveau 2 voor en op elk niveau daarboven, didactisch opgebouwd: een dalende reeks die door nul zakt (N2), een verweven reeks die door nul zakt (N3), een zigzag naar negatief en negatieve constanten (N4), en tot slot een negatieve factor met wisselend teken (N5). Elk niveau vanaf 2 heeft minstens een strategie die gegarandeerd negatieve getallen oplevert; `__tests__/numeric.test.ts` bewaakt dat.

Elke familie heeft een onafhankelijke verificatie in `__tests__/numeric.test.ts` zodat het juiste antwoord eenduidig is.

## Letterpatronen: strategieen

Ook de letter-generator werkt met families (zie `generators/letters.ts`, `LetterFamily`), zodat dezelfde puzzelvorm niet steeds terugkomt:
- L1: constante stap vooruit/achteruit, letterparen die opschuiven (AB, DE, GH, ...).
- L2: grotere constante stap, oplopende stap, twee afwisselende stappen.
- L3: veranderende stap (groter/kleiner), grotere afwisselende stappen, twee verweven reeksen, letterparen met grotere sprong.
- L4: sterk oplopende stap, zigzag (vooruit/achteruit), verweven met een teruglopende reeks, reeks vanaf het begin verweven met een reeks vanaf het eind van het alfabet, paren waarvan de letters uit elkaar lopen.
- L5: stap volgens Fibonacci, drie verweven reeksen, zigzag met netto achterwaartse drift, verweving en spiegeling met grotere stappen.

Een reeks wordt waar mogelijk zo in het alfabet gelegd dat er geen omslag van Z naar A nodig is. Op niveau 1 en 2 past dat altijd; komt een omslag op hogere niveaus toch voor, dan wijst de uitleg de gebruiker erop.

## Itemkwaliteit (belangrijk)

- Elk item heeft **exact één** eenduidig juist antwoord. Houd generatoren bewust beperkt om dubbelzinnige reeksen te voorkomen.
- Voor elke generator een **Vitest-test** die controleert dat het opgegeven juiste antwoord echt klopt en dat geen enkele afleider ook een geldige voortzetting is.
- Woordrelaties niet in de browser genereren: gebruik de gecureerde, handmatig gecontroleerde bank.

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

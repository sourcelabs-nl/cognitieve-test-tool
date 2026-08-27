// Centrale datacontracten voor de oefentool.

export type Category = 'numeric' | 'letters' | 'verbal' | 'mixed';

// De categorieen waarin een item daadwerkelijk gegenereerd kan worden.
// 'mixed' is een keuzemodus, geen itemcategorie.
export type ItemCategory = Exclude<Category, 'mixed'>;

export type Mode = 'practice' | 'test';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 6;

// Getrapte hulp bij een item, opvraagbaar tijdens het oefenen. Geen van beide
// teksten noemt het antwoord: samen doen ze de eerste denkstap voor, de laatste
// stap blijft aan de gebruiker.
export interface Hint {
  strategy: string; // hoe pak je dit soort vraag aan (zegt niets over dit item)
  step: string; // de eerste concrete denkstap voor juist dit item
}

// De vraagvorm van een item. Binnen een categorie komen meerdere vormen voor,
// zoals ook in de echte politietest: naast reeksen ook rasters, "welke hoort
// niet in de rij" en dubbele analogieen. De vorm bepaalt welke aanpak-hulp de
// gebruiker krijgt (zie generators/hints.ts).
export type ItemForm =
  | 'numericSeries'
  | 'numericGrid'
  | 'numericOddOne'
  | 'letterSeries'
  | 'letterOddOne'
  | 'verbalSingle'
  | 'verbalDouble';

// Sommige items tonen hun opgave als raster in plaats van als rij: vakjes met
// getallen waarvan er precies een leeg is. De regel loopt dan per rij of per
// kolom, niet van links naar rechts door de hele reeks.
export interface ItemGrid {
  cols: number; // aantal kolommen; het aantal rijen volgt uit de lengte van cells
  cells: string[]; // rij voor rij; het gevraagde vakje bevat '?'
}

export interface Item {
  id: string;
  category: ItemCategory;
  form: ItemForm; // vraagvorm binnen de categorie
  level: number; // 1..6, moeilijkheid van dit item
  prompt: string; // vraagtekst
  grid?: ItemGrid; // aanwezig bij matrix-items; de prompt bevat dan geen reeks
  options: string[]; // meerkeuze-opties
  correctIndex: number; // index van het juiste antwoord in options
  explanation: string; // uitleg, gebruikt voor feedback in oefenmodus
  hint: Hint; // getrapte hulp, alleen gebruikt in oefenmodus
}

export interface Answer {
  itemId: string;
  category: ItemCategory;
  chosenIndex: number;
  correct: boolean;
  responseMs: number;
  levelAtTime: number; // generatie-niveau van het getoonde item
  estimateAtTime: number; // continue schatting op het moment van antwoorden
}

export interface SessionState {
  category: Category;
  mode: Mode;
  estimate: number; // continue niveau-schatting 1.0..6.0
  stepSize: number; // huidige staircase-stap
  lastDirection: 'up' | 'down' | null; // voor detectie van richtingsomkeringen
  answers: Answer[];
  finished: boolean;
}

// Samenvatting van een afgeronde sessie, opgeslagen in de historie.
export interface SessionResult {
  id: string;
  category: Category;
  mode: Mode;
  finalEstimate: number; // eind-niveauschatting 1.0..6.0
  percentCorrect: number; // 0..100
  averageResponseMs: number;
  itemCount: number;
  score: number; // spelscore: niveau-, snelheids- en reeksbonus
  bestStreak: number; // langste reeks goede antwoorden achter elkaar
  estimateTrail: number[]; // niveauverloop: schatting na elk antwoord
  completedAt: string; // ISO-datum en -tijd
}

export interface Profile {
  id: string;
  name: string;
  avatar?: string; // id van de gekozen avatar (zie ui/avatars.tsx)
  // Gekozen voorleesstem (`voiceURI` uit de Web Speech API). Leeg betekent:
  // automatisch de beste beschikbare stem kiezen. Welke stemmen er zijn hangt
  // van het apparaat af, dus na een import op een ander toestel kan deze stem
  // ontbreken; `resolveVoice` valt dan terug op de automatische keuze.
  voiceURI?: string;
  createdAt: string; // ISO-datum
  history: SessionResult[];
}

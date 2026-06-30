// Centrale datacontracten voor de oefentool.

export type Category = 'numeric' | 'letters' | 'verbal' | 'mixed';

// De categorieen waarin een item daadwerkelijk gegenereerd kan worden.
// 'mixed' is een keuzemodus, geen itemcategorie.
export type ItemCategory = Exclude<Category, 'mixed'>;

export type Mode = 'practice' | 'test';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

export interface Item {
  id: string;
  category: ItemCategory;
  level: number; // 1..5, moeilijkheid van dit item
  prompt: string; // vraagtekst
  options: string[]; // meerkeuze-opties
  correctIndex: number; // index van het juiste antwoord in options
  explanation: string; // uitleg, gebruikt voor feedback in oefenmodus
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
  estimate: number; // continue niveau-schatting 1.0..5.0
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
  finalEstimate: number; // eind-niveauschatting 1.0..5.0
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
  createdAt: string; // ISO-datum
  history: SessionResult[];
}

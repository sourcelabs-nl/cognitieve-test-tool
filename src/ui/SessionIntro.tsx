// Introscherm voor een sessie: laat duidelijk zien op welk niveau de gebruiker
// start (en waarom), met uitleg, en een simpele voorbeeldvraag om op te warmen.
// De voorbeeldvraag telt niet mee voor de score of het niveau.

import { useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import type { Category, Mode } from '../engine/types';
import { categoryLabels, generate } from '../generators';
import { levelForEstimate } from '../engine/adaptive';
import { LevelInfo } from './LevelInfo';
import { SpeakButton } from './SpeakButton';
import { toSpoken } from './speech';

interface Props {
  category: Category;
  mode: Mode;
  startEstimate: number;
  isReturning: boolean; // true als het startniveau uit eerdere sessies komt
  onStart: () => void;
  onBack: () => void;
}

export function SessionIntro({ category, mode, startEstimate, isReturning, onStart, onBack }: Props) {
  // Een eenvoudige warming-up: vaste, lage moeilijkheid en telt niet mee.
  const [example] = useState(() => generate(category, 1, 0));
  const [chosen, setChosen] = useState<number | null>(null);

  const startLevel = levelForEstimate(startEstimate);

  const optionClass = (index: number): string => {
    if (chosen === null) return 'option';
    if (index === example.correctIndex) return 'option correct';
    if (index === chosen) return 'option wrong';
    return 'option dimmed';
  };

  return (
    <section className="screen">
      <header className="screen-header">
        <h1>{categoryLabels[category]}</h1>
        <button className="btn" onClick={onBack}>
          <ArrowLeft size={18} /> Terug
        </button>
      </header>

      <div className="start-level">
        <span className="start-level-label">Je start op niveau</span>
        <span className="start-level-value">{startLevel}</span>
        <span className="muted">
          {isReturning
            ? 'gebaseerd op je vorige sessie in deze categorie'
            : 'we beginnen in het midden en passen het tijdens de test aan'}
        </span>
      </div>

      <LevelInfo />

      <h2>Voorbeeldvraag</h2>
      <p className="muted">Even opwarmen. Deze vraag telt niet mee.</p>

      <div className="prompt">
        <div className="prompt-top">
          <SpeakButton text={toSpoken(example.prompt)} label="Lees de vraag voor" />
        </div>
        {example.prompt.split('\n').map((line, i) => (
          <p key={i} className={i === 0 ? 'prompt-text' : 'prompt-sequence'}>{line}</p>
        ))}
      </div>

      <div className="options">
        {example.options.map((opt, i) => (
          <button key={i} className={optionClass(i)} onClick={() => setChosen(i)} disabled={chosen !== null}>
            {opt}
          </button>
        ))}
      </div>

      {chosen !== null && (
        <div className={`feedback ${chosen === example.correctIndex ? 'good' : 'bad'}`}>
          <div className="feedback-head">
            <p className="feedback-title">{chosen === example.correctIndex ? 'Goed!' : 'Net niet.'}</p>
            <SpeakButton text={example.explanation} label="Lees de uitleg voor" />
          </div>
          <p>{example.explanation}</p>
        </div>
      )}

      <div className="footer-actions">
        <button className="primary" onClick={onStart}>
          <Play size={18} /> {mode === 'practice' ? 'Start de oefening' : 'Start de test'}
        </button>
      </div>
    </section>
  );
}

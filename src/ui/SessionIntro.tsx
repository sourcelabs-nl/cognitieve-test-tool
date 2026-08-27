// Intro voor een sessie in twee stappen:
//   1. Een aparte pagina die laat zien op welk niveau je start (met betekenis
//      en uitleg).
//   2. Een simpele voorbeeldvraag om op te warmen (telt niet mee).
// Daarna begint de echte sessie.

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Hourglass, Info, Play } from 'lucide-react';
import type { Category, Mode } from '../engine/types';
import { categoryLabels, generate } from '../generators';
import { levelForEstimate } from '../engine/adaptive';
import { levelLabel } from '../engine/levels';
import { LevelExplanation } from './LevelInfo';
import { ItemPrompt, layoutFor } from './ItemPrompt';
import { SpeakButton } from './SpeakButton';
import { gridToSpoken, toSpoken } from './speech';

interface Props {
  category: Category;
  mode: Mode;
  startEstimate: number;
  isReturning: boolean; // true als het startniveau uit eerdere sessies komt
  onStart: () => void;
  onBack: () => void;
}

export function SessionIntro({ category, mode, startEstimate, isReturning, onStart, onBack }: Props) {
  const [step, setStep] = useState<'level' | 'warmup'>('level');
  const [infoOpen, setInfoOpen] = useState(false);

  // Een eenvoudige warming-up: vaste, lage moeilijkheid en telt niet mee.
  const [example] = useState(() => generate(category, 1, 0));
  const [chosen, setChosen] = useState<number | null>(null);

  const startLevel = levelForEstimate(startEstimate);

  if (step === 'level') {
    return (
      <section className="screen">
        <header className="screen-header">
          <h1>{categoryLabels[category]}</h1>
          <button className="btn" onClick={onBack}>
            <ArrowLeft size={18} /> Terug
          </button>
        </header>

        <div className="start-level">
          <span className="start-level-label">Je start op oefenniveau</span>
          <span className="start-level-main">
            <span className="start-level-value">{startLevel}</span>
            <span className="start-level-band">(indicatie: {levelLabel(startLevel)})</span>
          </span>
          <span className="muted">
            {isReturning
              ? 'gebaseerd op je vorige sessie in deze categorie'
              : 'we beginnen in het midden en passen het tijdens de test aan'}
          </span>
        </div>

        {/* In testmodus loopt er een klok. Dat hoor je van tevoren te weten, niet
            pas als de balk bij de eerste vraag begint te lopen. */}
        {mode === 'test' && (
          <p className="muted intro-note">
            <Hourglass size={16} /> Elke vraag heeft een tijdslimiet, net als in de echte test.
            Moeilijkere vragen krijgen meer tijd. Loopt de tijd af, dan gaat de test door naar de
            volgende vraag.
          </p>
        )}

        <div className="footer-actions">
          <button className="btn" onClick={() => setInfoOpen((v) => !v)} aria-expanded={infoOpen}>
            <Info size={18} /> Hoe werkt mijn niveau?
          </button>
          <button className="primary" onClick={() => setStep('warmup')}>
            Verder <ArrowRight size={18} />
          </button>
        </div>

        {infoOpen && <LevelExplanation />}
      </section>
    );
  }

  const optionClass = (index: number): string => {
    if (chosen === null) return 'option';
    if (index === example.correctIndex) return 'option correct';
    if (index === chosen) return 'option wrong';
    return 'option dimmed';
  };

  return (
    <section className="screen">
      <header className="screen-header">
        <h1>Voorbeeldvraag</h1>
        <button className="btn" onClick={() => setStep('level')}>
          <ArrowLeft size={18} /> Terug
        </button>
      </header>

      <p className="muted">Even opwarmen. Deze vraag telt niet mee.</p>

      <div className="prompt">
        <div className="prompt-top">
          <SpeakButton
            text={
              example.grid
                ? `${toSpoken(example.prompt)} ${gridToSpoken(example.grid)}`
                : toSpoken(example.prompt)
            }
            label="Lees de vraag voor"
          />
        </div>
        <ItemPrompt item={example} />
      </div>

      <div className={layoutFor(example.form).options}>
        {example.options.map((opt, i) => (
          <button key={i} className={optionClass(i)} onClick={() => setChosen(i)} disabled={chosen !== null}>
            {opt}
          </button>
        ))}
      </div>

      {/* Net als op het vraagscherm staat de knop die verder gaat boven de
          uitleg-kaart, niet eronder: bij een lange uitleg valt hij anders buiten
          het scherm, en de plek van de knop hoort niet te verspringen zodra er
          feedback verschijnt. */}
      <div className="footer-actions">
        <button className="primary" onClick={onStart}>
          <Play size={18} /> {mode === 'practice' ? 'Start de oefening' : 'Start de test'}
        </button>
      </div>

      {chosen !== null && (
        <div className={`feedback ${chosen === example.correctIndex ? 'good' : 'bad'}`}>
          <div className="feedback-head">
            <p className="feedback-title">{chosen === example.correctIndex ? 'Goed!' : 'Net niet.'}</p>
            <SpeakButton text={example.explanation} label="Lees de uitleg voor" />
          </div>
          <p className="feedback-explanation">{example.explanation}</p>
        </div>
      )}
    </section>
  );
}

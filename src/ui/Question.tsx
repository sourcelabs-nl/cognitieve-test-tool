// Vraagscherm: toont het item, vangt het antwoord en de responstijd, houdt de
// spelscore en combo bij. In oefenmodus volgt directe feedback met uitleg; in
// testmodus gaat het meteen door. Halverwege verschijnt een motiverend feit.

import { Flame, Lightbulb, TrendingUp, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Category, Mode, SessionResult } from '../engine/types';
import { categoryLabels } from '../generators';
import { useSession } from '../state/useSession';
import { SpeakButton } from './SpeakButton';
import { gridToSpoken, toSpoken } from './speech';

interface Props {
  category: Category;
  mode: Mode;
  startEstimate?: number;
  onComplete: (result: SessionResult) => void;
  onQuit: () => void;
}

export function Question({ category, mode, startEstimate, onComplete, onQuit }: Props) {
  const { item, feedback, tip, score, streak, levelUp, itemNumber, totalItems, hintLevel, hintsLeft, revealHint, submitAnswer, proceed, dismissTip, isLastQuestion } =
    useSession({ category, mode, startEstimate, onComplete });

  // Hulp hoort bij oefenen. In testmodus is er bewust geen tussentijdse
  // ondersteuning, net zoals er dan ook geen feedback per vraag is.
  const helpAvailable = mode === 'practice' && !feedback;

  const progress = Math.round(((itemNumber - 1) / totalItems) * 100);

  // Bij een raster staat de opgave niet in de prompt, dus die moet apart mee
  // naar de voorleesknop.
  const spokenQuestion = item.grid
    ? `${toSpoken(item.prompt)} ${gridToSpoken(item.grid)}`
    : toSpoken(item.prompt);

  // Bepaalt de css-klasse van een optieknop op basis van de feedback.
  const optionClass = (index: number): string => {
    if (!feedback) return 'option';
    if (index === feedback.correctIndex) return 'option correct';
    if (index === feedback.chosenIndex) return 'option wrong';
    return 'option dimmed';
  };

  // Een motiverend feit halverwege: blokkeert kort en gaat daarna verder.
  if (tip) {
    return (
      <section className="screen">
        <div className="fact-card">
          <p className="fact-title">{tip.title}</p>
          <p>{tip.body}</p>
          <button className="primary" onClick={dismissTip} autoFocus>Verder oefenen</button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen question-screen">
      <header className="screen-header">
        <span className="muted">{categoryLabels[category]} · {mode === 'practice' ? 'Oefenen' : 'Test'}</span>
        <button className="btn" onClick={onQuit}>
          <X size={18} /> Stoppen
        </button>
      </header>

      <div className="score-row">
        <span className="score-badge">{score} punten</span>
        {streak >= 2 && (
          <span className="combo-badge" title="Goede antwoorden achter elkaar">
            <Flame size={15} /> {streak}x
          </span>
        )}
      </div>

      <div className="progress-bar" aria-hidden>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="muted progress-text">Vraag {itemNumber} van {totalItems}</p>

      {levelUp && (
        <div className="levelup-banner" role="status">
          <TrendingUp size={18} /> Oefenniveau {levelUp} bereikt!
        </div>
      )}

      <div className="prompt">
        <div className="prompt-top">
          <SpeakButton text={spokenQuestion} label="Lees de vraag voor" />
        </div>
        {item.prompt.split('\n').map((line, i) => (
          <p key={i} className={i === 0 ? 'prompt-text' : 'prompt-sequence'}>{line}</p>
        ))}
        {item.grid && (
          // Bewust een div-grid en geen <table>: het raster is een plaatje van de
          // opgave, geen gegevenstabel om doorheen te navigeren. Een label plus de
          // cellen in leesvolgorde vertelt alles wat nodig is; rij- en kolomkoppen
          // die een tabel verwacht zijn er niet.
          <div
            className="prompt-grid"
            role="group"
            aria-label="Raster met getallen"
            style={{ '--cols': item.grid.cols } as CSSProperties}
          >
            {item.grid.cells.map((cell, i) =>
              cell === '?' ? (
                <span key={i} className="grid-cell grid-cell-missing" aria-label="gevraagd vakje">?</span>
              ) : (
                <span key={i} className="grid-cell">{cell}</span>
              ),
            )}
          </div>
        )}
      </div>

      <div className="options">
        {item.options.map((opt, i) => (
          <button
            key={i}
            className={optionClass(i)}
            onClick={() => submitAnswer(i)}
            disabled={feedback !== null}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Zodra het antwoord er is, verdwijnt de hulp: de uitleg vertelt nu het
          hele verhaal, en twee opengeklapte tredes hulp duwden de doorgaan-knop
          honderden pixels onder de onderkant van het scherm. */}
      {hintLevel > 0 && !feedback && (
        <div className="hint-card" role="status">
          <div className="hint-head">
            <p className="hint-title">
              <Lightbulb size={16} /> Zo pak je het aan
            </p>
            <SpeakButton text={item.hint.strategy} label="Lees de hulp voor" />
          </div>
          <p>{item.hint.strategy}</p>
          {hintLevel > 1 && (
            <>
              <div className="hint-head hint-head-second">
                <p className="hint-title">Deze vraag</p>
                <SpeakButton text={item.hint.step} label="Lees de tip voor" />
              </div>
              <p>{item.hint.step}</p>
            </>
          )}
        </div>
      )}

      {helpAvailable && hintsLeft > 0 && (
        <div className="footer-actions">
          <button className="btn" onClick={revealHint}>
            <Lightbulb size={18} /> {hintLevel === 0 ? 'Hulp' : 'Nog een tip'}
          </button>
        </div>
      )}

      {feedback && (
        <div className={`feedback ${feedback.correct ? 'good' : 'bad'}`}>
          <div className="feedback-head">
            <p className="feedback-title">
              {feedback.correct
                ? `Goed! +${feedback.pointsEarned} punten${feedback.hintUsed ? ' (halve punten, met hulp)' : ''}`
                : 'Helaas, niet juist.'}
            </p>
            <SpeakButton text={feedback.explanation} label="Lees de uitleg voor" />
          </div>
          {/* De knop staat bewust boven de uitleg, ongeveer op de plek waar
              tijdens het nadenken de hulpknop stond. Onder een lange uitleg
              viel hij buiten het scherm, waardoor je eerst moest scrollen om
              verder te kunnen. */}
          <div className="feedback-actions">
            <button className="primary" onClick={proceed} autoFocus>
              {isLastQuestion ? 'Bekijk resultaat' : 'Volgende vraag'}
            </button>
          </div>
          <p className="feedback-explanation">{feedback.explanation}</p>
        </div>
      )}
    </section>
  );
}

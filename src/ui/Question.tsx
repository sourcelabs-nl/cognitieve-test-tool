// Vraagscherm: toont het item, vangt het antwoord en de responstijd, houdt de
// spelscore en combo bij. In oefenmodus volgt directe feedback met uitleg; in
// testmodus gaat het meteen door. Halverwege verschijnt een motiverend feit.

import { Flame, TrendingUp, X } from 'lucide-react';
import type { Category, Mode, SessionResult } from '../engine/types';
import { categoryLabels } from '../generators';
import { useSession } from '../state/useSession';
import { SpeakButton } from './SpeakButton';
import { toSpoken } from './speech';

interface Props {
  category: Category;
  mode: Mode;
  startEstimate?: number;
  onComplete: (result: SessionResult) => void;
  onQuit: () => void;
}

export function Question({ category, mode, startEstimate, onComplete, onQuit }: Props) {
  const { item, feedback, tip, score, streak, levelUp, itemNumber, totalItems, submitAnswer, proceed, dismissTip, isLastQuestion } =
    useSession({ category, mode, startEstimate, onComplete });

  const progress = Math.round(((itemNumber - 1) / totalItems) * 100);

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
          <TrendingUp size={18} /> Niveau {levelUp} bereikt!
        </div>
      )}

      <div className="prompt">
        <div className="prompt-top">
          <SpeakButton text={toSpoken(item.prompt)} label="Lees de vraag voor" />
        </div>
        {item.prompt.split('\n').map((line, i) => (
          <p key={i} className={i === 0 ? 'prompt-text' : 'prompt-sequence'}>{line}</p>
        ))}
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

      {feedback && (
        <div className={`feedback ${feedback.correct ? 'good' : 'bad'}`}>
          <div className="feedback-head">
            <p className="feedback-title">
              {feedback.correct ? `Goed! +${feedback.pointsEarned} punten` : 'Helaas, niet juist.'}
            </p>
            <SpeakButton text={feedback.explanation} label="Lees de uitleg voor" />
          </div>
          <p>{feedback.explanation}</p>
          <button className="primary" onClick={proceed} autoFocus>
            {isLastQuestion ? 'Bekijk resultaat' : 'Volgende vraag'}
          </button>
        </div>
      )}
    </section>
  );
}

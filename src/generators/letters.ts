// Letterpatronen: procedureel gegenereerde letterreeksen op niveau 1..5.
// Letters worden gerekend als posities A=0..Z=25 met modulo-26 wrap, zodat
// reeksen altijd binnen het alfabet blijven en eindig zijn.

import type { Item } from '../engine/types';
import { randInt, buildOptions } from './random';

const A = 65;

export function letterAt(index: number): string {
  const wrapped = ((index % 26) + 26) % 26;
  return String.fromCharCode(A + wrapped);
}

function indexOfLetter(letter: string): number {
  return letter.charCodeAt(0) - A;
}

interface Series {
  letters: string[];
  answerIndex: number; // positie-index van de volgende letter
  explanation: string;
}

// Niveau 1: constante alfabetstap.
function level1(): Series {
  const start = randInt(0, 15);
  const step = randInt(1, 4);
  const letters = Array.from({ length: 5 }, (_, i) => letterAt(start + i * step));
  return {
    letters,
    answerIndex: start + 5 * step,
    explanation: `Elke stap is +${step} in het alfabet. Na ${letters[4]} volgt ${letterAt(start + 5 * step)}.`,
  };
}

// Niveau 2: oplopende stap.
function level2(): Series {
  const start = randInt(0, 10);
  const firstStep = randInt(1, 3);
  const increment = randInt(1, 2);
  const positions = [start];
  for (let i = 0; i < 4; i++) {
    positions.push(positions[i] + firstStep + i * increment);
  }
  const lastStep = firstStep + 4 * increment;
  const letters = positions.map(letterAt);
  return {
    letters,
    answerIndex: positions[4] + lastStep,
    explanation: `De stap loopt op met +${increment}: +${firstStep}, +${firstStep + increment}, ... De volgende stap is +${lastStep}, dus na ${letters[4]} volgt ${letterAt(positions[4] + lastStep)}.`,
  };
}

// Niveau 3: twee verweven reeksen (beide vooruit, eigen stap).
function level3(): Series {
  const startA = randInt(0, 6);
  const stepA = randInt(2, 4);
  const startB = randInt(13, 19);
  const stepB = randInt(2, 4);
  const letters = [
    letterAt(startA),
    letterAt(startB),
    letterAt(startA + stepA),
    letterAt(startB + stepB),
    letterAt(startA + 2 * stepA),
    letterAt(startB + 2 * stepB),
  ];
  return {
    letters,
    answerIndex: startA + 3 * stepA,
    explanation: `Twee verweven reeksen. De oneven posities lopen +${stepA} (${letterAt(startA)}, ${letterAt(startA + stepA)}, ...), de even +${stepB}. De volgende letter hoort bij de eerste reeks: na ${letterAt(startA + 2 * stepA)} volgt ${letterAt(startA + 3 * stepA)}.`,
  };
}

// Niveau 4: twee afwisselende stappen (+a, +b, +a, +b, ...).
function level4(): Series {
  const start = randInt(0, 10);
  const stepA = randInt(1, 3);
  const stepB = randInt(3, 5);
  const positions = [start];
  for (let i = 0; i < 5; i++) {
    positions.push(positions[i] + (i % 2 === 0 ? stepA : stepB));
  }
  const visible = positions.slice(0, 5).map(letterAt);
  // volgende stap heeft index 4 -> even -> stepA
  return {
    letters: visible,
    answerIndex: positions[4] + stepA,
    explanation: `De stappen wisselen elkaar af: +${stepA}, +${stepB}, +${stepA}, +${stepB}, ... De volgende stap is +${stepA}, dus na ${visible[4]} volgt ${letterAt(positions[4] + stepA)}.`,
  };
}

// Niveau 5: een vooruit- en een achteruitreeks verweven.
function level5(): Series {
  const startF = randInt(0, 6);
  const stepF = randInt(1, 3);
  const startB = randInt(19, 25);
  const stepB = randInt(1, 3);
  const letters = [
    letterAt(startF),
    letterAt(startB),
    letterAt(startF + stepF),
    letterAt(startB - stepB),
    letterAt(startF + 2 * stepF),
    letterAt(startB - 2 * stepB),
  ];
  return {
    letters,
    answerIndex: startF + 3 * stepF,
    explanation: `Twee verweven reeksen: de oneven posities lopen vooruit +${stepF}, de even posities lopen achteruit -${stepB}. De volgende letter hoort bij de vooruitreeks: na ${letterAt(startF + 2 * stepF)} volgt ${letterAt(startF + 3 * stepF)}.`,
  };
}

const builders = [level1, level2, level3, level4, level5];

// Bouwt de Series voor een gegeven niveau (1..5). Exporteerbaar voor tests.
export function buildLetterSeries(level: number): Series {
  const clamped = Math.min(5, Math.max(1, Math.round(level)));
  return builders[clamped - 1]();
}

let counter = 0;

export function generateLetters(level: number): Item {
  const clamped = Math.min(5, Math.max(1, Math.round(level)));
  const series = buildLetterSeries(clamped);
  const correct = letterAt(series.answerIndex);
  const distractors = [
    letterAt(series.answerIndex + 1),
    letterAt(series.answerIndex - 1),
    letterAt(series.answerIndex + 2),
    series.letters[series.letters.length - 1],
    letterAt(series.answerIndex - 2),
  ];
  const { options, correctIndex } = buildOptions(correct, distractors);
  counter += 1;
  return {
    id: `letters-${clamped}-${counter}`,
    category: 'letters',
    level: clamped,
    prompt: `Welke letter komt er op de plek van het vraagteken?\n\n${series.letters.join(', ')}, ?`,
    options,
    correctIndex,
    explanation: series.explanation,
  };
}

// Hulpfunctie voor tests: bepaalt de juiste letter uit een Series.
export { indexOfLetter };

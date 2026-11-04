import { describe, expect, it } from 'vitest';
import { findLabel, textLines } from '../../../src/core/screen/anchors';
import { combinePasses } from '../../../src/core/screen/passes';
import type { Word } from '../../../src/core/screen/types';
import { word } from './wordsOf';

const sure = (w: Word, conf: number): Word => ({ ...w, conf });

// Made-up layout, as fractions of the image width: labels only the dark-ink pass reads,
// button text only the plain pass reads.
const DARK = [
  word('STARDUST', 0, [0.1, 1.0, 0.3, 1.02]),
  word('ARON', 0, [0.5, 1.0, 0.6, 1.02]),
  word('CANDY', 0, [0.62, 1.0, 0.75, 1.02]),
];
const PLAIN = [
  word('POWER', 0, [0.1, 1.2, 0.2, 1.23]),
  word('UP', 0, [0.21, 1.2, 0.26, 1.23]),
  word('2,500', 0, [0.4, 1.2, 0.5, 1.23]),
];

describe('combinePasses', () => {
  it('keeps the labels from the dark-ink pass and the button text from the plain pass', () => {
    expect(textLines(combinePasses(DARK, PLAIN))).toEqual(['STARDUST ARON CANDY', 'POWER UP 2,500']);
  });

  it('numbers the lines top to bottom across both passes', () => {
    const lines = combinePasses(DARK, PLAIN).map((w) => w.line);
    expect(lines).toEqual([0, 0, 0, 1, 1, 1]);
    expect(textLines(combinePasses(PLAIN, DARK))).toEqual(['STARDUST ARON CANDY', 'POWER UP 2,500']);
  });

  it('keeps the dark-ink word where both passes read the same spot equally surely', () => {
    const junk = word('S22', 0, [0.11, 1.0, 0.2, 1.02]);
    expect(textLines(combinePasses(DARK, [junk]))).toEqual(['STARDUST ARON CANDY']);
  });

  it('keeps the more confident word where both passes read the same spot', () => {
    const inked = sure(word('Palessand', 0, [0.1, 1.0, 0.4, 1.04]), 30);
    const plain = sure(word('Palossand', 0, [0.1, 1.0, 0.4, 1.04]), 90);
    expect(textLines(combinePasses([inked], [plain]))).toEqual(['Palossand']);
    expect(textLines(combinePasses([sure(inked, 95)], [plain]))).toEqual(['Palessand']);
  });

  it('weighs a word against all the words the other pass read over it', () => {
    const whole = sure(word('153/153', 0, [0.1, 1.0, 0.4, 1.03]), 60);
    const parts = [sure(word('A5', 0, [0.1, 1.0, 0.2, 1.03]), 80), sure(word('ITAS', 0, [0.22, 1.0, 0.4, 1.03]), 20)];
    expect(textLines(combinePasses(parts, [whole]))).toEqual(['153/153']);
  });

  it('settles a spot once, even where words from one pass run into the next word of the other', () => {
    const dark = [sure(word('LUCKY', 0, [0.362, 0.977, 0.473, 1.002]), 96), sure(word('POKEMON', 0, [0.478, 0.977, 0.638, 1.002]), 89)];
    const plain = [sure(word('LUCKY', 0, [0.357, 0.977, 0.462, 1.001]), 96), sure(word('POKEMON', 0, [0.472, 0.97, 0.64, 1.001]), 96)];
    expect(textLines(combinePasses(dark, plain))).toEqual(['LUCKY POKEMON']);
  });

  it('keeps a word on the line its pass read it in, when its neighbour lost to the other pass', () => {
    const dark = [sure(word('Palessand', 0, [0.1, 1.0, 0.4, 1.04]), 30), sure(word('-', 0, [0.8, 1.035, 0.82, 1.06]), 50)];
    const plain = [sure(word('Palossand', 0, [0.1, 1.0, 0.4, 1.04]), 90), sure(word('153/153', 1, [0.1, 1.07, 0.4, 1.1]), 80)];
    expect(textLines(combinePasses(dark, plain))).toEqual(['Palossand -', '153/153']);
  });

  it('puts words side by side on one line, left to right, whichever pass read them', () => {
    const cost = word('25', 3, [0.8, 1.0, 0.85, 1.02]);
    const lead = word('S', 7, [0.0, 1.0, 0.05, 1.02]);
    expect(textLines(combinePasses(DARK, [cost, lead]))).toEqual(['S STARDUST ARON CANDY 25']);
  });

  it('leaves labels findable after combining', () => {
    expect(findLabel(combinePasses(DARK, PLAIN), 'POWER UP')).toBeDefined();
  });

  it('handles an empty pass', () => {
    expect(combinePasses([], PLAIN)).toEqual(PLAIN);
    expect(combinePasses([], [])).toEqual([]);
  });
});

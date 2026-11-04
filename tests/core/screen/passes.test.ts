import { describe, expect, it } from 'vitest';
import { findLabel, textLines } from '../../../src/core/screen/anchors';
import { combinePasses } from '../../../src/core/screen/passes';
import { word } from './wordsOf';

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

  it('prefers the dark-ink word where both passes read the same spot', () => {
    const junk = word('S22', 0, [0.11, 1.0, 0.2, 1.02]);
    expect(textLines(combinePasses(DARK, [junk]))).toEqual(['STARDUST ARON CANDY']);
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

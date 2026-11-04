import { describe, expect, it } from 'vitest';
import { above, findLabel, rightOf, textLines, wordsIn } from '../../../src/core/screen/anchors';
import { word, wordsOf } from './wordsOf';

describe('findLabel', () => {
  it('finds a two-word label on one line and returns the box around both words', () => {
    const words = wordsOf('CP 1499\nPOWER UP 9,000 12');
    const box = findLabel(words, 'POWER UP')!;
    expect([box.x0, box.y0, box.x1, box.y1].map((v) => v.toFixed(2))).toEqual(['0.05', '0.05', '0.21', '0.08']);
  });

  it('ignores case and stray punctuation', () => {
    expect(findLabel(wordsOf('Power up:'), 'POWER UP')).toBeDefined();
  });

  it('finds a label that wraps onto the next line under it', () => {
    const words = [word('123', 0, [0.1, 0.3, 0.2, 0.33]), word('DRATINI', 0, [0.4, 0.3, 0.55, 0.33]), word('CANDY', 1, [0.42, 0.34, 0.52, 0.37])];
    expect(findLabel(words, 'DRATINI CANDY')).toEqual({ x0: 0.4, y0: 0.3, x1: 0.55, y1: 0.37 });
  });

  it('does not join words on the next line that sit elsewhere', () => {
    const words = [word('DRATINI', 0, [0.4, 0.3, 0.55, 0.33]), word('CANDY', 1, [0.7, 0.34, 0.8, 0.37])];
    expect(findLabel(words, 'DRATINI CANDY')).toBeUndefined();
  });

  it('returns nothing when the label is missing', () => {
    expect(findLabel(wordsOf('POWER\nSTARDUST'), 'POWER UP')).toBeUndefined();
  });
});

describe('regions', () => {
  const label = { x0: 0.4, y0: 0.5, x1: 0.6, y1: 0.52 };

  it('looks above a label, a little wider than it', () => {
    const box = above(label);
    expect([box.x0, box.x1, box.y1].map((v) => v.toFixed(2))).toEqual(['0.32', '0.68', '0.49']);
    expect(box.y0).toBeCloseTo(0.41);
  });

  it('looks right of a label, to the edge of the image', () => {
    const box = rightOf(label);
    expect([box.x0, box.x1, box.y0, box.y1]).toEqual([0.6, 1, 0.49, 0.53]);
  });
});

describe('wordsIn', () => {
  it('keeps the words whose centre is inside the region', () => {
    const words = wordsOf('POWER UP 9,000 12');
    expect(wordsIn(words, { x0: 0.25, y0: 0, x1: 1, y1: 0.03 }).map((w) => w.text)).toEqual(['9,000', '12']);
  });
});

describe('textLines', () => {
  it('joins the words of each OCR line in order', () => {
    expect(textLines(wordsOf('CP 1499\n\n191 / 191 HP'))).toEqual(['CP 1499', '191 / 191 HP']);
  });
});

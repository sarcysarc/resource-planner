import type { Word } from '../../../src/core/screen/types';

// Made-up geometry, as fractions of the image width.
const CHAR = 0.02;
const GAP = 0.02;
const LINE = 0.05;
const HEIGHT = 0.03;

/** Lays text out as word boxes: one OCR line per text line, words left to right. */
export function wordsOf(text: string, left = 0.05): Word[] {
  return text.split('\n').flatMap((row, line) => {
    let x = left;
    return row.split(' ').filter(Boolean).map((word) => {
      const box = { x0: x, y0: line * LINE, x1: x + word.length * CHAR, y1: line * LINE + HEIGHT };
      x = box.x1 + GAP;
      return { text: word, box, line };
    });
  });
}

/** One word with an explicit box. */
export const word = (text: string, line: number, [x0, y0, x1, y1]: number[]): Word => ({ text, line, box: { x0, y0, x1, y1 } });

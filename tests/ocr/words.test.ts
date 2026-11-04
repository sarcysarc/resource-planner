import { describe, expect, it } from 'vitest';
import { toWords } from '../../src/ocr/words';

const w = (text: string, x0: number, y0: number) => ({ text, bbox: { x0, y0, x1: x0 + 100, y1: y0 + 20 } });
const page = {
  blocks: [
    { paragraphs: [{ lines: [{ words: [w('POWER', 100, 400), w('UP', 220, 400)] }] }] },
    { paragraphs: [{ lines: [{ words: [w(' 9,000 ', 400, 400)] }, { words: [w('', 0, 0), w('HP', 50, 500)] }] }] },
  ],
};

describe('toWords', () => {
  it('turns tesseract blocks into words with boxes as fractions of the width', () => {
    expect(toWords(page, 1000)[0]).toEqual({ text: 'POWER', line: 0, box: { x0: 0.1, y0: 0.4, x1: 0.2, y1: 0.42 } });
  });

  it('numbers lines across blocks and paragraphs, trims text and skips empty words', () => {
    expect(toWords(page, 1000).map((x) => [x.text, x.line])).toEqual([['POWER', 0], ['UP', 0], ['9,000', 1], ['HP', 2]]);
  });

  it('returns no words when tesseract found no blocks', () => {
    expect(toWords({ blocks: null }, 1000)).toEqual([]);
  });
});

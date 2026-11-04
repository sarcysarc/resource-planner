import { describe, expect, it } from 'vitest';
import { textInk } from '../../src/ocr/ink';
import type { Pixels } from '../../src/ocr/pixels';
import { blankScreen, paint } from './fakeScreen';

// Colours measured on real 720 px wide screenshots.
const GREEN = [122, 214, 152];
const GREY = [153, 174, 176];
const EDGE = [200, 210, 210];
const RED = [240, 90, 90];
const WHITE = [255, 255, 255];
const at = (px: Pixels, x: number, y = 0) => px.data[(y * px.width + x) * 4];
// The painted start of the row; the rest is white card.
const row = (px: Pixels, n: number) => Array.from({ length: n }, (_, x) => at(px, x));

// One 720 px row, painted from the left with [colour, how many] pairs, then white.
function strip(...runs: [number[], number][]): Pixels {
  const px = blankScreen(720, 1);
  let x = 0;
  for (const [colour, count] of runs) for (let i = 0; i < count; i++) paint(px, [x++, 0], colour);
  return px;
}

describe('textInk', () => {
  it('turns dark, grey and red text black and the white card white, at full size', () => {
    const out = textInk(strip([WHITE, 3], [GREY, 2], [WHITE, 30], [RED, 2], [WHITE, 3]));
    expect([out.width, out.height]).toEqual([720, 1]);
    expect(row(out, 40)).toEqual([...Array(3).fill(255), 0, 0, ...Array(30).fill(255), 0, 0, 255, 255, 255]);
    expect(out.data[3]).toBe(255);
  });

  it('turns white letters on a coloured button black, and the button white', () => {
    const out = textInk(strip([GREEN, 4], [WHITE, 5], [GREEN, 3], [WHITE, 5], [GREEN, 4]));
    expect(row(out, 21)).toEqual([255, 255, 255, 255, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 255, 255, 255, 255]);
  });

  it('keeps wide white areas white even between coloured parts', () => {
    expect(row(textInk(strip([GREEN, 2], [WHITE, 40], [GREEN, 2])), 44).every((v) => v === 255)).toBe(true);
  });

  it('keeps the gaps between grey letters white, despite their pale edges', () => {
    const out = textInk(strip([GREY, 2], [EDGE, 1], [WHITE, 3], [EDGE, 1], [GREY, 2]));
    expect(row(out, 9)).toEqual([0, 0, 255, 255, 255, 255, 255, 0, 0]);
  });
});

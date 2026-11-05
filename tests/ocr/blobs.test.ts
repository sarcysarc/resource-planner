import { describe, expect, it } from 'vitest';
import { dropBlobs } from '../../src/ocr/blobs';
import type { Pixels } from '../../src/ocr/pixels';
import { blankScreen, paint } from './fakeScreen';

// A CP band of a 720 px wide screenshot, black ink on white, as `cpBand` makes it.
const SCREEN = 720;
const band = (): Pixels => blankScreen(504, 144);
const BLACK = [0, 0, 0];

function box(px: Pixels, [x, y]: [number, number], [w, h]: [number, number]): void {
  for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) paint(px, [col, row], BLACK);
}
// A "0" in the large CP font: 24 by 36, strokes 4 thick.
function zero(px: Pixels, [x, y]: [number, number]): void {
  box(px, [x, y], [24, 4]);
  box(px, [x, y + 32], [24, 4]);
  box(px, [x, y], [4, 36]);
  box(px, [x + 20, y], [4, 36]);
}
const inkAt = (px: Pixels, x: number, y: number) => px.data[(y * px.width + x) * 4] === 0;

describe('dropBlobs', () => {
  it('keeps strokes the size of a CP digit and the small CP letters', () => {
    const px = band();
    zero(px, [100, 50]);
    box(px, [40, 70], [10, 10]);
    dropBlobs(px, SCREEN);
    expect([inkAt(px, 102, 60), inkAt(px, 45, 75)]).toEqual([true, true]);
  });

  it('drops patches too tall, too wide or too solid to be a digit', () => {
    const px = band();
    box(px, [10, 0], [4, 80]);
    box(px, [200, 130], [200, 10]);
    box(px, [400, 20], [40, 40]);
    dropBlobs(px, SCREEN);
    expect([inkAt(px, 11, 40), inkAt(px, 300, 135), inkAt(px, 420, 40)]).toEqual([false, false, false]);
  });

  it('drops a patch whole, a digit beside it kept', () => {
    const px = band();
    box(px, [400, 20], [40, 40]);
    zero(px, [370, 30]);
    dropBlobs(px, SCREEN);
    expect([inkAt(px, 439, 59), inkAt(px, 372, 50)]).toEqual([false, true]);
  });
});

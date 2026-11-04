import { describe, expect, it } from 'vitest';
import { inkCrop } from '../../src/ocr/crop';
import type { Pixels } from '../../src/ocr/pixels';
import { blankScreen, paint } from './fakeScreen';

const GREEN = [100, 200, 120];
const TEAL = [68, 105, 108];
const at = (px: Pixels, [x, y]: [number, number]) => px.data[(y * px.width + x) * 4];

function button(): Pixels {
  const px = blankScreen(100, 100);
  for (let i = 0; i < 100 * 100; i++) px.data.set(GREEN, i * 4);
  paint(px, [50, 40], [255, 255, 255]);
  return px;
}

describe('inkCrop', () => {
  const box = { x0: 0.4, y0: 0.3, x1: 0.6, y1: 0.5 };

  it('crops the region, doubles it and pads it with white', () => {
    const out = inkCrop(button(), { box, ink: 'white' });
    expect([out.width, out.height]).toEqual([2 * 20 + 40, 2 * 20 + 40]);
    expect(at(out, [0, 0])).toBe(255);
  });

  it('makes text of the ink colour black and everything else white', () => {
    const out = inkCrop(button(), { box, ink: 'white' });
    expect([at(out, [20 + 20, 20 + 20]), at(out, [20 + 21, 20 + 21])]).toEqual([0, 0]);
    expect(at(out, [20 + 2, 20 + 2])).toBe(255);
  });

  it('reads dark teal label text', () => {
    const px = blankScreen(100, 100);
    paint(px, [50, 40], TEAL);
    expect(at(inkCrop(px, { box, ink: 'teal' }), [40, 40])).toBe(0);
  });

  it('drops dark grey icon stripes next to teal text', () => {
    const px = blankScreen(100, 100);
    paint(px, [50, 40], [56, 56, 56]);
    expect(at(inkCrop(px, { box, ink: 'teal' }), [40, 40])).toBe(255);
  });

  it('reads the trainer level in its team colour, but not the pale background', () => {
    const px = blankScreen(100, 100);
    paint(px, [50, 40], [237, 91, 91]);
    paint(px, [45, 35], [254, 244, 244]);
    const out = inkCrop(px, { box, ink: 'colour' });
    expect([at(out, [40, 40]), at(out, [30, 30])]).toEqual([0, 255]);
    paint(px, [50, 40], [40, 120, 230]);
    expect(at(inkCrop(px, { box, ink: 'colour' }), [40, 40])).toBe(0);
  });

  it('reads a cost in teal, or in red when there is not enough Candy, but not its coin icon', () => {
    const px = blankScreen(100, 100);
    paint(px, [50, 40], [255, 94, 99]);
    paint(px, [52, 40], TEAL);
    paint(px, [54, 40], [57, 60, 63]);
    const out = inkCrop(px, { box, ink: 'cost' });
    expect([at(out, [40, 40]), at(out, [44, 40]), at(out, [48, 40])]).toEqual([0, 0, 255]);
  });

  it('keeps the crop inside the image', () => {
    const out = inkCrop(blankScreen(100, 100), { box: { x0: 0.9, y0: 0.9, x1: 1.5, y1: 1.5 }, ink: 'teal' });
    expect([out.width, out.height]).toEqual([2 * 10 + 40, 2 * 10 + 40]);
  });
});


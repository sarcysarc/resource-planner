import type { Ink, Region } from '../core/screen/types';
import type { Pixels } from './pixels';

// Measured on real screenshots: white text on buttons, dark teal for labels and totals.
// Teal needs its blue-green tint too: Candy XL icons have dark grey or brown stripes
// (tint 0 to 7) that are otherwise close enough to pass, while the text has 24 or more.
const white = (r: number, g: number, b: number) => Math.min(r, g, b) > 215;
const teal = (r: number, g: number, b: number) => Math.abs(r - 68) + Math.abs(g - 105) + Math.abs(b - 108) < 120 && Math.min(g, b) - r >= 16;
// The cost a player cannot afford is red, (255, 94, 99) on a real screenshot.
const red = (r: number, g: number, b: number) => r - Math.max(g, b) > 80;
const isInk: Record<Ink, (r: number, g: number, b: number) => boolean> = {
  white,
  teal,
  cost: (r, g, b) => teal(r, g, b) || red(r, g, b),
  // The profile's pale background differs from white by 20 or less; team colours by 140 or more.
  colour: (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) > 80,
};
const SCALE = 2;
const PAD = 20;

function bounds(px: Pixels, region: Region) {
  const clamp = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v * px.width)));
  const { x0, y0, x1, y1 } = region.box;
  return { left: clamp(x0, px.width), top: clamp(y0, px.height), right: clamp(x1, px.width), bottom: clamp(y1, px.height) };
}

/** Crops a region and keeps only text of its ink colour, black on white, doubled and padded for OCR. */
export function inkCrop(px: Pixels, region: Region): Pixels {
  const { left, top, right, bottom } = bounds(px, region);
  const [width, height] = [(right - left) * SCALE + 2 * PAD, (bottom - top) * SCALE + 2 * PAD];
  const out = { width, height, data: new Uint8ClampedArray(width * height * 4).fill(255) };
  for (let i = 0; i < width * height; i++) {
    const [x, y] = [left + Math.floor((i % width - PAD) / SCALE), top + Math.floor((Math.floor(i / width) - PAD) / SCALE)];
    if (x < left || x >= right || y < top || y >= bottom) continue;
    const from = (y * px.width + x) * 4;
    if (isInk[region.ink](px.data[from], px.data[from + 1], px.data[from + 2])) out.data.fill(0, i * 4, i * 4 + 3);
  }
  return out;
}


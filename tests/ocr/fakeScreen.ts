import type { Pixels } from '../../src/ocr/pixels';

// Layout and colours measured on real 720 px wide appraisal screenshots (ADR 0008).
export const ORANGE = [242, 166, 74];
const RED = [222, 125, 128];
const TRACK = [226, 226, 224];
const BAR_X = [85, 335];
const GAPS = [[166, 169], [250, 253]];
export const BAR_ROWS = [1245, 1311, 1377];
const BAR_HEIGHT = 15;

export function blankScreen(width = 720, height = 1604): Pixels {
  return { width, height, data: new Uint8ClampedArray(width * height * 4).fill(255) };
}

export function paint(px: Pixels, [x, y]: [number, number], rgb: number[]): void {
  px.data.set(rgb, (y * px.width + x) * 4);
}

const inGap = (x: number) => GAPS.some(([from, to]) => x >= from && x <= to);

/** Draws one appraisal bar filled to `iv` out of 15, starting at row `top`. */
export function drawBar(px: Pixels, top: number, iv: number): void {
  const xs = Array.from({ length: BAR_X[1] - BAR_X[0] + 1 }, (_, i) => BAR_X[0] + i).filter((x) => !inGap(x));
  const filled = Math.round((iv / 15) * xs.length);
  const colour = iv === 15 ? RED : ORANGE;
  for (let y = top; y < top + BAR_HEIGHT; y++) {
    xs.forEach((x, i) => paint(px, [x, y], i < filled ? colour : TRACK));
  }
}

export function appraisalScreen(ivs: [number, number, number]): Pixels {
  const px = blankScreen();
  BAR_ROWS.forEach((top, i) => drawBar(px, top, ivs[i]));
  return px;
}

/** A screen whose sky above the card is one colour, with a few white stars in it. */
export function skyScreen(rgb: number[]): Pixels {
  const px = blankScreen();
  for (let y = 0; y < 520; y++) for (let x = 0; x < px.width; x++) paint(px, [x, y], rgb);
  for (let y = 200; y < 480; y += 40) paint(px, [20, y], [255, 255, 255]);
  return px;
}

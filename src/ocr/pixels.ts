import type { IVs } from '../core/types';
import { dropBlobs } from './blobs';

/** Raw RGBA pixels; a browser `ImageData` fits this shape. */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

type Rgb = readonly [number, number, number];

// Measured on real appraisal screenshots; see docs/adr/0008.
const FILL: Rgb[] = [[242, 166, 74], [222, 125, 128]];
const TRACK: Rgb = [226, 226, 224];
const TOLERANCE = 30;

const near = (px: Pixels, i: number, [r, g, b]: Rgb) =>
  Math.abs(px.data[i] - r) + Math.abs(px.data[i + 1] - g) + Math.abs(px.data[i + 2] - b) < TOLERANCE;

interface BarRow {
  y: number;
  fill: number;
  track: number;
}

// Bars sit in the left half of the screen.
function scanRow(px: Pixels, y: number): BarRow {
  const row = { y, fill: 0, track: 0 };
  for (let x = 0; x < px.width / 2; x++) {
    const i = (y * px.width + x) * 4;
    if (FILL.some((rgb) => near(px, i, rgb))) row.fill++;
    else if (near(px, i, TRACK)) row.track++;
  }
  return row;
}

/** Groups of consecutive rows where at least a quarter of the width is bar-coloured. */
function barRuns(px: Pixels): BarRow[][] {
  const runs: BarRow[][] = [];
  for (let y = 0; y < px.height; y++) {
    const row = scanRow(px, y);
    if (row.fill + row.track < px.width / 4) continue;
    const last = runs.at(-1);
    if (last && last.at(-1)!.y === y - 1) last.push(row);
    else runs.push([row]);
  }
  return runs;
}

/** Reads Attack, Defense and HP IVs from the appraisal bars, if the screenshot shows them. */
export function appraisalBars(px: Pixels): IVs | undefined {
  const tall = (run: BarRow[]) => run.length >= px.width * 0.01 && run.length <= px.width * 0.04;
  const bars = barRuns(px).filter(tall).slice(-3);
  if (bars.length < 3) return undefined;
  const [atk, def, hp] = bars.map((run) => {
    const { fill, track } = run[Math.floor(run.length / 2)];
    return Math.round((15 * fill) / (fill + track));
  });
  return { atk, def, hp };
}

// Where the CP sits, as fractions of the screenshot width.
const CP_BAND = { left: 0.15, top: 0.05, width: 0.7, height: 0.2 };

/** Crops the CP area and turns near-white text black on white, which OCR reads reliably; patches too big to be digits are left out. */
export function cpBand(px: Pixels): Pixels {
  const [left, top, width, height] = [CP_BAND.left, CP_BAND.top, CP_BAND.width, CP_BAND.height].map((f) => Math.round(f * px.width));
  const out = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  for (let i = 0; i < width * height; i++) {
    const from = ((top + Math.floor(i / width)) * px.width + left + (i % width)) * 4;
    const white = Math.min(px.data[from], px.data[from + 1], px.data[from + 2]) > 215;
    out.data.fill(white ? 0 : 255, i * 4, i * 4 + 3);
    out.data[i * 4 + 3] = 255;
  }
  dropBlobs(out, px.width);
  return out;
}

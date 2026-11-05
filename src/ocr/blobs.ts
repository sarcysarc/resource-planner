// Fix C2 of the 2026-11-04 stress test: on a bright background, keeping only near-white pixels
// in the CP band also keeps large patches of background, and OCR then misses the CP. Patches
// that can't be digits are turned back to white; on the stress set this lost no CP.
import type { Pixels } from './pixels';

// As fractions of the screenshot's width. CP digits are about 0.05 tall and their strokes
// are thin; a solid patch bigger than the CP letters is background.
const MAX_TALL = 0.09;
const MAX_WIDE = 0.2;
const MAX_SOLID = 0.7;
const SOLID_AREA = 0.0004;

interface Patch {
  cells: number[];
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const isInk = (band: Pixels, i: number) => band.data[i * 4] === 0;

function neighbours(band: Pixels, i: number): number[] {
  const { width, height } = band;
  const x = i % width;
  const y = (i - x) / width;
  return [x > 0 && i - 1, x < width - 1 && i + 1, y > 0 && i - width, y < height - 1 && i + width].filter((j): j is number => j !== false);
}

// The ink cells joined to `start`, side by side, with the box around them.
function patchAt(band: Pixels, start: number, seen: Uint8Array): Patch {
  const patch: Patch = { cells: [], x0: band.width, x1: 0, y0: band.height, y1: 0 };
  const todo = [start];
  seen[start] = 1;
  for (let i = todo.pop(); i !== undefined; i = todo.pop()) {
    patch.cells.push(i);
    const [x, y] = [i % band.width, Math.floor(i / band.width)];
    Object.assign(patch, { x0: Math.min(patch.x0, x), x1: Math.max(patch.x1, x), y0: Math.min(patch.y0, y), y1: Math.max(patch.y1, y) });
    const next = neighbours(band, i).filter((j) => !seen[j] && isInk(band, j));
    next.forEach((j) => (seen[j] = 1));
    todo.push(...next);
  }
  return patch;
}

function tooBig({ cells, x0, x1, y0, y1 }: Patch, screen: number): boolean {
  const [wide, tall] = [x1 - x0 + 1, y1 - y0 + 1];
  const solid = cells.length / (wide * tall) > MAX_SOLID && cells.length > SOLID_AREA * screen * screen;
  return tall > MAX_TALL * screen || wide > MAX_WIDE * screen || solid;
}

/** Turns white the ink patches of a black-on-white CP band too big or solid to be digits. */
export function dropBlobs(band: Pixels, screenWidth: number): void {
  const seen = new Uint8Array(band.width * band.height);
  for (let i = 0; i < seen.length; i++) {
    if (seen[i] || !isInk(band, i)) continue;
    const patch = patchAt(band, i, seen);
    if (tooBig(patch, screenWidth)) patch.cells.forEach((cell) => band.data.fill(255, cell * 4, cell * 4 + 3));
  }
}

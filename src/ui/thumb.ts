// Tile thumbnails (ADR 0015): the top of a screenshot only, so the appraisal footer and
// anything below the Pokémon is never shown or saved. Kept small for the device's storage.
import type { Group } from '../core/screen/merge';
import type { Reading } from '../core/screen/types';

const WIDTH = 160;
/** How much of the screenshot's height is kept, from the top. */
const TOP = 0.45;

export interface Crop {
  /** The source width and height taken from the top left. */
  sw: number;
  sh: number;
  /** The thumbnail's size. */
  width: number;
  height: number;
}

/** The part of a screenshot a thumbnail keeps: the top, never taller than it is wide. */
export function cropBox(width: number, height: number): Crop {
  const sh = Math.round(Math.min(height * TOP, width));
  return { sw: width, sh, width: WIDTH, height: Math.round((WIDTH * sh) / width) };
}

// Two readings agree on a value when either lacks it or both show the same.
const agree = (a: unknown, b: unknown) => a === undefined || b === undefined || JSON.stringify(a) === JSON.stringify(b);

// By CP (and HP), or by HP and IVs when the Pokémon hid its CP.
function showsIt(r: Reading, reading: Reading): boolean {
  if (reading.cp !== undefined) return r.cp === reading.cp && agree(r.hp, reading.hp);
  return reading.hp !== undefined && r.hp === reading.hp && agree(r.ivs, reading.ivs);
}

/** The first screenshot showing this Pokémon: its CP, or its HP when the CP was hidden. */
export function pickShot(readings: readonly Reading[], { reading }: Group): number | undefined {
  const at = readings.findIndex((r) => showsIt(r, reading));
  return at < 0 ? undefined : at;
}

/** A small JPEG of the top of the screenshot, or undefined when the browser can't draw it. */
export async function makeThumb(file: Blob): Promise<string | undefined> {
  try {
    const image = await createImageBitmap(file);
    const crop = cropBox(image.width, image.height);
    const canvas = Object.assign(document.createElement('canvas'), { width: crop.width, height: crop.height });
    canvas.getContext('2d')!.drawImage(image, 0, 0, crop.sw, crop.sh, 0, 0, crop.width, crop.height);
    image.close();
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return undefined;
  }
}

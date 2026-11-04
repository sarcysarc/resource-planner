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

/** The first screenshot showing this Pokémon's CP (with its HP, when both are known). */
export function pickShot(readings: readonly Reading[], { reading }: Group): number | undefined {
  if (reading.cp === undefined) return undefined;
  const at = readings.findIndex((r) => r.cp === reading.cp && (r.hp === undefined || reading.hp === undefined || r.hp === reading.hp));
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

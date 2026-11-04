import { readScan } from '../core/screen/read';
import type { Reading } from '../core/screen/types';
import type { Modifiers } from '../core/types';

/** What a batch of images gave, oldest first, and how many could not be read at all. */
export interface Images {
  readings: Reading[];
  /** The screenshot each reading came from, at the same index. */
  files: File[];
  failed: number;
}

/** The status line while reading image `n` of `total`. */
export function progressNote(n: number, total: number): string {
  const which = total > 1 ? ` ${n} of ${total}` : '';
  return `Reading screenshot${which}… The first time can take a few seconds.`;
}

/** The sentence about images that failed, or '' when none did. */
export function failedNote(failed: number): string {
  if (!failed) return '';
  return ` ${failed} image${failed > 1 ? 's' : ''} could not be read.`;
}

/**
 * Reads images one at a time, oldest first (totals change, so order matters). The OCR
 * engine loads on first use. `progress` gets the number of the image being read.
 */
export async function readImages(files: File[], mods: Modifiers, progress: (n: number) => void): Promise<Images> {
  const { readScreenshot } = await import('../ocr/recognize');
  const sorted = [...files].sort((a, b) => a.lastModified - b.lastModified);
  const readings: Reading[] = [];
  const read: File[] = [];
  let failed = 0;
  for (const [i, file] of sorted.entries()) {
    progress(i + 1);
    try {
      readings.push(readScan(await readScreenshot(file), mods));
      read.push(file);
    } catch {
      failed += 1;
    }
  }
  return { readings, files: read, failed };
}

import { createWorker, OEM, PSM, type RecognizeOptions, type Worker } from 'tesseract.js';
import { levelRegion } from '../core/screen/account';
import { pokemonRegions } from '../core/screen/pokemon';
import { combinePasses } from '../core/screen/passes';
import { needsDarkPass } from '../core/screen/darkPass';
import { dropLocation } from '../core/screen/privacy';
import { totalRegions } from '../core/screen/totals';
import type { Region, RegionName, Scan, Word } from '../core/screen/types';
import { inkCrop } from './crop';
import { textInk } from './ink';
import { imagePixels, pixelsBlob } from './image';
import { appraisalBars, cpBand, type Pixels } from './pixels';
import { toWords } from './words';

// Self-hosted copies made by scripts/copy-ocr-assets.mjs; see docs/adr/0008.
const asset = (file = '') => new URL(`ocr/${file}`, document.baseURI).href;

const startWorker = () =>
  createWorker('eng', OEM.LSTM_ONLY, { workerPath: asset('worker.min.js'), corePath: asset(), langPath: asset() });

const pageWords = async (worker: Worker, image: Blob, width: number) =>
  toWords((await worker.recognize(image, {}, { blocks: true })).data, width);

// First pass: every word with its box, read from the plain image (white button text) and,
// when needed, from a dark-ink copy (small grey labels). Location words are dropped
// straight away (ADR 0009).
async function readWords(worker: Worker, { image, px, bars }: { image: Blob; px: Pixels; bars: boolean }): Promise<Word[]> {
  const plain = await pageWords(worker, image, px.width);
  const dark = needsDarkPass(plain, bars) ? await pageWords(worker, await pixelsBlob(textInk(px)), px.width) : [];
  return dropLocation(combinePasses(dark, plain));
}

// Set for one call only, so a reused worker reads the next page as text. tesseract.js passes
// Tesseract parameters given to recognize() through and restores them afterwards
// (worker-script recognize: SaveParameters, RestoreParameters); its types leave them out.
const DIGITS = { tessedit_char_whitelist: '0123456789,/', tessedit_pageseg_mode: PSM.SINGLE_LINE } as unknown as Partial<RecognizeOptions>;

// Second pass: numbers next to icons read badly in the first pass, so re-read their
// regions as digits only, after keeping just the text colour (ADR 0009).
async function readDigits(worker: Worker, px: Pixels, words: Word[]): Promise<Scan['digits']> {
  const level = levelRegion(words);
  const all = { ...pokemonRegions(words), ...totalRegions(words), ...(level && { trainerLevel: level }) };
  const regions = Object.entries(all) as [RegionName, Region][];
  if (!regions.length) return {};
  const digits: Scan['digits'] = {};
  for (const [name, region] of regions) {
    digits[name] = (await worker.recognize(await pixelsBlob(inkCrop(px, region)), DIGITS)).data.text;
  }
  return digits;
}

async function readWith(worker: Worker, image: Blob): Promise<Scan> {
  const px = await imagePixels(image);
  const ivs = appraisalBars(px);
  const words = await readWords(worker, { image, px, bars: ivs !== undefined });
  const cpText = (await worker.recognize(await pixelsBlob(cpBand(px)))).data.text;
  const digits = await readDigits(worker, px, words);
  return ivs ? { words, cpText, digits, ivs } : { words, cpText, digits };
}

/** Reads screenshots one after another with one OCR worker, started once (fix E). */
export interface Reader {
  read(image: Blob): Promise<Scan>;
  close(): Promise<void>;
}

/** Starts the OCR worker. Nothing is uploaded and no location text is kept. */
export async function openReader(): Promise<Reader> {
  const worker = await startWorker();
  return { read: (image) => readWith(worker, image), close: async () => void (await worker.terminate()) };
}

/** Reads one screenshot on this device with a worker of its own. */
export async function readScreenshot(image: Blob): Promise<Scan> {
  const reader = await openReader();
  try {
    return await reader.read(image);
  } finally {
    await reader.close();
  }
}

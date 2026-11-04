import { createWorker, OEM, PSM, type Worker } from 'tesseract.js';
import { pokemonRegions } from '../core/screen/pokemon';
import { dropLocation } from '../core/screen/privacy';
import type { Region, RegionName, Scan, Word } from '../core/screen/types';
import { inkCrop } from './crop';
import { imagePixels, pixelsBlob } from './image';
import { appraisalBars, cpBand, type Pixels } from './pixels';
import { toWords } from './words';

// Self-hosted copies made by scripts/copy-ocr-assets.mjs; see docs/adr/0008.
const asset = (file = '') => new URL(`ocr/${file}`, document.baseURI).href;

const startWorker = () =>
  createWorker('eng', OEM.LSTM_ONLY, { workerPath: asset('worker.min.js'), corePath: asset(), langPath: asset() });

// First pass: every word with its box. Location words are dropped straight away (ADR 0009).
async function readWords(worker: Worker, image: Blob, width: number): Promise<Word[]> {
  const { data } = await worker.recognize(image, {}, { blocks: true });
  return dropLocation(toWords(data, width));
}

// Second pass: numbers next to icons read badly in the first pass, so re-read their
// regions as digits only, after keeping just the text colour (ADR 0009).
async function readDigits(worker: Worker, px: Pixels, words: Word[]): Promise<Scan['digits']> {
  const regions = Object.entries(pokemonRegions(words)) as [RegionName, Region][];
  if (!regions.length) return {};
  await worker.setParameters({ tessedit_char_whitelist: '0123456789,/', tessedit_pageseg_mode: PSM.SINGLE_LINE });
  const digits: Scan['digits'] = {};
  for (const [name, region] of regions) {
    digits[name] = (await worker.recognize(await pixelsBlob(inkCrop(px, region)))).data.text;
  }
  return digits;
}

/** Reads a screenshot on this device. Nothing is uploaded and no location text is kept. */
export async function readScreenshot(image: Blob): Promise<Scan> {
  const px = await imagePixels(image);
  const worker = await startWorker();
  try {
    const words = await readWords(worker, image, px.width);
    const cpText = (await worker.recognize(await pixelsBlob(cpBand(px)))).data.text;
    const digits = await readDigits(worker, px, words);
    const ivs = appraisalBars(px);
    return ivs ? { words, cpText, digits, ivs } : { words, cpText, digits };
  } finally {
    await worker.terminate();
  }
}

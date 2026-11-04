import { createWorker, OEM } from 'tesseract.js';
import type { IVs } from '../core/types';
import { imagePixels, pixelsBlob } from './image';
import { appraisalBars, cpBand } from './pixels';

/** What a screenshot holds: its text, the text of the CP area, and appraisal IVs if shown. */
export interface ScreenshotText {
  text: string;
  cpText: string;
  ivs?: IVs;
}

// Self-hosted copies made by scripts/copy-ocr-assets.mjs; see docs/adr/0008.
const asset = (file = '') => new URL(`ocr/${file}`, document.baseURI).href;

const startWorker = () =>
  createWorker('eng', OEM.LSTM_ONLY, { workerPath: asset('worker.min.js'), corePath: asset(), langPath: asset() });

/** Reads a screenshot on this device. Nothing is uploaded. */
export async function readScreenshot(image: Blob): Promise<ScreenshotText> {
  const px = await imagePixels(image);
  const worker = await startWorker();
  try {
    const text = (await worker.recognize(image)).data.text;
    const cpText = (await worker.recognize(await pixelsBlob(cpBand(px)))).data.text;
    const ivs = appraisalBars(px);
    return ivs ? { text, cpText, ivs } : { text, cpText };
  } finally {
    await worker.terminate();
  }
}

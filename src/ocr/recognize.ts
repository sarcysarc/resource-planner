import { createWorker, OEM } from 'tesseract.js';

// Self-hosted copies made by scripts/copy-ocr-assets.mjs; see docs/adr/0008.
const asset = (file = '') => new URL(`ocr/${file}`, document.baseURI).href;

/** Reads the text in an image on this device. Nothing is uploaded. */
export async function recognizeText(image: Blob): Promise<string> {
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: asset('worker.min.js'),
    corePath: asset(),
    langPath: asset(),
  });
  try {
    return (await worker.recognize(image)).data.text;
  } finally {
    await worker.terminate();
  }
}

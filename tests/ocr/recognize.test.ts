// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { appraisalScreen, blankScreen } from './fakeScreen';

const worker = {
  recognize: vi.fn(async (image: Blob) => ({ data: { text: image.type === 'image/png' ? '1499' : 'CP 1499' } })),
  terminate: vi.fn(async () => undefined),
};
const createWorker = vi.fn(async () => worker);
vi.mock('tesseract.js', () => ({ createWorker, OEM: { LSTM_ONLY: 1 } }));

const imagePixels = vi.fn(async () => blankScreen());
vi.mock('../../src/ocr/image', () => ({ imagePixels, pixelsBlob: async () => new Blob([], { type: 'image/png' }) }));

const { readScreenshot } = await import('../../src/ocr/recognize');

describe('readScreenshot', () => {
  it('returns the full text and the text of the CP area', async () => {
    expect(await readScreenshot(new Blob())).toEqual({ text: 'CP 1499', cpText: '1499' });
  });

  it('adds the IVs when the screenshot shows appraisal bars', async () => {
    imagePixels.mockResolvedValueOnce(appraisalScreen([12, 13, 15]));
    expect((await readScreenshot(new Blob())).ivs).toEqual({ atk: 12, def: 13, hp: 15 });
  });

  it('loads every OCR file from this site, never a CDN', async () => {
    await readScreenshot(new Blob());
    const [lang, oem, options] = createWorker.mock.lastCall as unknown as [string, number, Record<string, string>];
    expect([lang, oem]).toEqual(['eng', 1]);
    const base = new URL('ocr/', document.baseURI).href;
    expect(options).toMatchObject({ workerPath: `${base}worker.min.js`, corePath: base, langPath: base });
  });

  it('shuts the worker down even when reading fails', async () => {
    worker.recognize.mockRejectedValueOnce(new Error('bad image'));
    worker.terminate.mockClear();
    await expect(readScreenshot(new Blob())).rejects.toThrow('bad image');
    expect(worker.terminate).toHaveBeenCalled();
  });
});

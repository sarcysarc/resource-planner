// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

const worker = { recognize: vi.fn(async () => ({ data: { text: 'CP 1499' } })), terminate: vi.fn(async () => undefined) };
const createWorker = vi.fn(async () => worker);
vi.mock('tesseract.js', () => ({ createWorker, OEM: { LSTM_ONLY: 1 } }));

const { recognizeText } = await import('../../src/ocr/recognize');

describe('recognizeText', () => {
  it('returns the text tesseract reads', async () => {
    expect(await recognizeText(new Blob())).toBe('CP 1499');
  });

  it('loads every OCR file from this site, never a CDN', async () => {
    await recognizeText(new Blob());
    const [lang, oem, options] = createWorker.mock.lastCall as unknown as [string, number, Record<string, string>];
    expect([lang, oem]).toEqual(['eng', 1]);
    const base = new URL('ocr/', document.baseURI).href;
    expect(options).toMatchObject({ workerPath: `${base}worker.min.js`, corePath: base, langPath: base });
  });

  it('shuts the worker down even when reading fails', async () => {
    worker.recognize.mockRejectedValueOnce(new Error('bad image'));
    worker.terminate.mockClear();
    await expect(recognizeText(new Blob())).rejects.toThrow('bad image');
    expect(worker.terminate).toHaveBeenCalled();
  });
});

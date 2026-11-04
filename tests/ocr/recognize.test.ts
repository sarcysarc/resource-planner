// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { appraisalScreen, blankScreen } from './fakeScreen';

// Made-up words; the place name is not real.
const line = (...words: [string, number][]) => ({ words: words.map(([text, x0]) => ({ text, bbox: { x0, y0: 700, x1: x0 + 60, y1: 720 } })) });
const PAGE = {
  text: 'not used',
  blocks: [{ paragraphs: [{ lines: [line(['POWER', 100], ['UP', 170], ['§7,O00', 400]), line(['CAUGHT', 100], ['IN', 170]), line(['Springfield', 100])] }] }],
};
const CROP = 'image/png';

const worker = {
  recognize: vi.fn(async (image: Blob) => ({ data: image.type === CROP ? { text: '7,000 8', blocks: null } : PAGE })),
  setParameters: vi.fn(async () => undefined),
  terminate: vi.fn(async () => undefined),
};
const createWorker = vi.fn(async () => worker);
vi.mock('tesseract.js', () => ({ createWorker, OEM: { LSTM_ONLY: 1 }, PSM: { SINGLE_LINE: '7' } }));

const imagePixels = vi.fn(async () => blankScreen());
vi.mock('../../src/ocr/image', () => ({ imagePixels, pixelsBlob: async () => new Blob([], { type: CROP }) }));

const { readScreenshot } = await import('../../src/ocr/recognize');

describe('readScreenshot', () => {
  it('returns the words without location, the CP area text and the re-read digits', async () => {
    const scan = await readScreenshot(new Blob());
    expect(scan.words.map((w) => w.text)).toEqual(['POWER', 'UP', '§7,O00', 'CAUGHT', 'IN']);
    expect(scan.words[0].box.x0).toBeCloseTo(100 / 720);
    expect(scan).toMatchObject({ cpText: '7,000 8', digits: { cost: '7,000 8' } });
    expect(scan.ivs).toBeUndefined();
  });

  it('re-reads digits only, one line at a time', async () => {
    await readScreenshot(new Blob());
    expect(worker.setParameters).toHaveBeenCalledWith({ tessedit_char_whitelist: '0123456789,/', tessedit_pageseg_mode: '7' });
  });

  it('skips the second pass when there is nothing to re-read', async () => {
    worker.recognize.mockResolvedValueOnce({ data: { text: '', blocks: null } });
    expect((await readScreenshot(new Blob())).digits).toEqual({});
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

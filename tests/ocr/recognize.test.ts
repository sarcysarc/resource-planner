// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { appraisalScreen, blankScreen } from './fakeScreen';

// Made-up words; the place name is not real.
const line = (y0: number, ...words: [string, number][]) => ({ words: words.map(([text, x0]) => ({ text, bbox: { x0, y0, x1: x0 + 60, y1: y0 + 20 } })) });
const PAGE = {
  text: 'not used',
  blocks: [{ paragraphs: [{ lines: [line(700, ['POWER', 100], ['UP', 170], ['§7,O00', 400]), line(760, ['CAUGHT', 100], ['IN', 170]), line(820, ['Springfield', 100])] }] }],
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

const { openReader, readScreenshot } = await import('../../src/ocr/recognize');

describe('readScreenshot', () => {
  it('returns the words without location, the CP area text and the re-read digits', async () => {
    const scan = await readScreenshot(new Blob());
    expect(scan.words.map((w) => w.text)).toEqual(['POWER', 'UP', '§7,O00', 'CAUGHT', 'IN']);
    expect(scan.words[0].box.x0).toBeCloseTo(100 / 720);
    expect(scan).toMatchObject({ cpText: '7,000 8', cpBright: '7,000 8', digits: { cost: '7,000 8' } });
    expect(scan.ivs).toBeUndefined();
  });

  // Set for each call only, so a worker reused for the next screenshot reads its page as text.
  it('re-reads digits only, one line at a time, without changing the worker for the page passes', async () => {
    worker.recognize.mockClear();
    await readScreenshot(new Blob());
    const digits = { tessedit_char_whitelist: '0123456789,/', tessedit_pageseg_mode: '7' };
    expect(worker.recognize.mock.calls.map((call) => (call as unknown[])[1])).toEqual([{}, {}, undefined, undefined, digits]);
    expect(worker.setParameters).not.toHaveBeenCalled();
  });

  it('reads many screenshots with one worker, shut down when closed', async () => {
    createWorker.mockClear();
    worker.terminate.mockClear();
    const reader = await openReader();
    await reader.read(new Blob());
    await reader.read(new Blob());
    expect([createWorker.mock.calls.length, worker.terminate.mock.calls.length]).toEqual([1, 0]);
    await reader.close();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('skips the dark-ink pass on an appraisal whose name and HP the plain pass read', async () => {
    // The page, the CP band and the bright CP band.
    const top = { text: '', blocks: [{ paragraphs: [{ lines: [line(100, ['Riolu', 100]), line(140, ['79', 100], ['/', 170], ['79', 240], ['HP', 310])] }] }] };
    imagePixels.mockResolvedValueOnce(appraisalScreen([12, 13, 15]));
    worker.recognize.mockClear().mockResolvedValueOnce({ data: top });
    const scan = await readScreenshot(new Blob());
    expect([scan.words.map((w) => w.text), worker.recognize.mock.calls.length]).toEqual([['Riolu', '79', '/', '79', 'HP'], 3]);
  });

  it('re-reads the resource totals above their labels', async () => {
    const labels = { text: '', blocks: [{ paragraphs: [{ lines: [line(700, ['STARDUST', 100], ['ARON', 300], ['CANDY', 370])] }] }] };
    worker.recognize.mockResolvedValueOnce({ data: labels });
    expect((await readScreenshot(new Blob())).digits).toEqual({ stardust: '7,000 8', candy: '7,000 8' });
  });

  it('adds the labels only a dark-ink copy of the screen shows, and re-reads their totals', async () => {
    const labels = { text: '', blocks: [{ paragraphs: [{ lines: [line(700, ['STARDUST', 100], ['ARON', 300], ['CANDY', 370])] }] }] };
    const button = { text: '', blocks: [{ paragraphs: [{ lines: [line(600, ['POWER', 100], ['UP', 170])] }] }] };
    worker.recognize.mockResolvedValueOnce({ data: button }).mockResolvedValueOnce({ data: labels });
    const scan = await readScreenshot(new Blob());
    expect(scan.words.map((w) => w.text)).toEqual(['POWER', 'UP', 'STARDUST', 'ARON', 'CANDY']);
    expect(scan.digits).toEqual({ cost: '7,000 8', stardust: '7,000 8', candy: '7,000 8' });
  });

  it('re-reads the trainer level above its label', async () => {
    const labels = { text: '', blocks: [{ paragraphs: [{ lines: [line(700, ['LEVEL', 100])] }] }] };
    worker.recognize.mockResolvedValueOnce({ data: labels });
    expect((await readScreenshot(new Blob())).digits).toEqual({ trainerLevel: '7,000 8' });
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

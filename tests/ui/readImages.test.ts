import { describe, expect, it, vi } from 'vitest';
import type { Scan } from '../../src/core/screen/types';
import { wordsOf } from '../core/screen/wordsOf';

const read = vi.fn<(image: Blob) => Promise<Scan>>();
const close = vi.fn(async () => undefined);
const openReader = vi.fn(async () => ({ read, close }));
vi.mock('../../src/ocr/recognize', () => ({ openReader }));

const { readImages } = await import('../../src/ui/readImages');

const MODS = { variant: 'normal', lucky: false } as const;
const lairon: Scan = { words: wordsOf('Lairon\n80 / 80 HP'), cpText: '600', digits: {} };
const files = (count: number) => Array.from({ length: count }, (_, i) => new File([], `${i}.png`, { lastModified: i }));

describe('readImages', () => {
  // Starting the OCR engine took most of each screenshot's time (fix E).
  it('reads every image with one reader, closed at the end', async () => {
    read.mockResolvedValue(lairon);
    const images = await readImages(files(3), MODS, () => undefined);
    expect([images.readings.length, openReader.mock.calls.length, read.mock.calls.length, close.mock.calls.length]).toEqual([3, 1, 3, 1]);
  });

  it('counts an image it could not read and still closes the reader', async () => {
    openReader.mockClear();
    close.mockClear();
    read.mockReset().mockRejectedValueOnce(new Error('broken')).mockResolvedValue(lairon);
    const images = await readImages(files(2), MODS, () => undefined);
    expect([images.readings.length, images.failed, close.mock.calls.length]).toEqual([1, 1, 1]);
  });
});

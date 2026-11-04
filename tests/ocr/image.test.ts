// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { imagePixels, pixelsBlob } from '../../src/ocr/image';

const context = {
  drawImage: vi.fn(),
  getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => ({ width, height })),
  putImageData: vi.fn(),
};

class FakeCanvas {
  constructor(readonly width: number, readonly height: number) {}
  getContext = () => context;
  convertToBlob = async () => new Blob([], { type: 'image/png' });
}

class FakeImageData {
  constructor(readonly data: Uint8ClampedArray, readonly width: number, readonly height: number) {}
}

vi.stubGlobal('OffscreenCanvas', FakeCanvas);
vi.stubGlobal('ImageData', FakeImageData);
afterEach(() => vi.clearAllMocks());

describe('imagePixels', () => {
  it('draws the decoded image and returns all of its pixels', async () => {
    const bitmap = { width: 3, height: 2, close: vi.fn() };
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));
    expect(await imagePixels(new Blob())).toEqual({ width: 3, height: 2 });
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0);
    expect(bitmap.close).toHaveBeenCalled();
  });
});

describe('pixelsBlob', () => {
  it('paints the pixels and encodes them as PNG', async () => {
    const blob = await pixelsBlob({ width: 1, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255]) });
    expect(blob.type).toBe('image/png');
    expect(context.putImageData.mock.lastCall?.[0]).toMatchObject({ width: 1, height: 1 });
  });
});

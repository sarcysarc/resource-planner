import type { Pixels } from './pixels';

/** Decodes an image file into raw pixels. */
export async function imagePixels(image: Blob): Promise<Pixels> {
  const bitmap = await createImageBitmap(image);
  const { width, height } = bitmap;
  const context = new OffscreenCanvas(width, height).getContext('2d')!;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return context.getImageData(0, 0, width, height);
}

/** Encodes raw pixels as a PNG, the form the OCR worker accepts. */
export function pixelsBlob(px: Pixels): Promise<Blob> {
  const canvas = new OffscreenCanvas(px.width, px.height);
  canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(px.data), px.width, px.height), 0, 0);
  return canvas.convertToBlob();
}

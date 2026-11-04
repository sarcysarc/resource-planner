import type { Word } from '../core/screen/types';

// The parts of tesseract.js's page result that we use (`blocks: true` output).
interface TessBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
interface TessPage {
  blocks: { paragraphs: { lines: { words: { text: string; bbox: TessBox }[] }[] }[] }[] | null;
}

/** Tesseract words → `Word[]` with boxes as fractions of the image width and lines numbered top-down. */
export function toWords(page: TessPage, width: number): Word[] {
  const lines = (page.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines));
  return lines.flatMap((line, n) =>
    line.words
      .filter((w) => w.text.trim())
      .map(({ text, bbox }) => ({
        text: text.trim(),
        line: n,
        box: { x0: bbox.x0 / width, y0: bbox.y0 / width, x1: bbox.x1 / width, y1: bbox.y1 / width },
      })),
  );
}

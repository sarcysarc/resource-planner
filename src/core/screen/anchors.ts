import type { Box, Word } from './types';

export const norm = (text: string) => text.toUpperCase().replace(/[^A-Z0-9&]/g, '');

export const union = (a: Box, b: Box): Box => ({
  x0: Math.min(a.x0, b.x0),
  y0: Math.min(a.y0, b.y0),
  x1: Math.max(a.x1, b.x1),
  y1: Math.max(a.y1, b.y1),
});

export const overlapsX = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1;

// The word that continues a label: next on the same line, or wrapped onto the line below.
function next(words: Word[], at: number, token: string): number {
  const prev = words[at];
  const same = words[at + 1];
  if (same?.line === prev.line) return norm(same.text) === token ? at + 1 : -1;
  return words.findIndex((w) => w.line === prev.line + 1 && norm(w.text) === token && overlapsX(w.box, prev.box));
}

function matchFrom(words: Word[], start: number, tokens: string[]): Box | undefined {
  let at = start;
  let box = words[start].box;
  for (const token of tokens.slice(1)) {
    at = next(words, at, token);
    if (at === -1) return undefined;
    box = union(box, words[at].box);
  }
  return box;
}

/** The box around a label such as "POWER UP", which may wrap over two lines. */
export function findLabel(words: Word[], label: string): Box | undefined {
  const tokens = label.split(' ').map(norm);
  for (const [i, word] of words.entries()) {
    const box = norm(word.text) === tokens[0] ? matchFrom(words, i, tokens) : undefined;
    if (box) return box;
  }
  return undefined;
}

/**
 * The area just above a label, a little wider than it: where a total sits. Pass one
 * line's height when the label wraps over two lines.
 */
export function above(label: Box, h = label.y1 - label.y0): Box {
  const w = label.x1 - label.x0;
  return { x0: label.x0 - 0.4 * w, y0: label.y0 - 4.5 * h, x1: label.x1 + 0.4 * w, y1: label.y0 - 0.5 * h };
}

/** The rest of the label's row, to the right edge: where a button's costs sit. */
export function rightOf(label: Box): Box {
  const h = label.y1 - label.y0;
  return { x0: label.x1, y0: label.y0 - 0.5 * h, x1: 1, y1: label.y1 + 0.5 * h };
}

/** Words whose centre lies inside the region. */
export function wordsIn(words: Word[], region: Box): Word[] {
  return words.filter(({ box }) => {
    const [x, y] = [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2];
    return x >= region.x0 && x <= region.x1 && y >= region.y0 && y <= region.y1;
  });
}

/** The text of each OCR line, top to bottom. */
export function textLines(words: Word[]): string[] {
  const lines = new Map<number, string[]>();
  for (const w of words) lines.set(w.line, [...(lines.get(w.line) ?? []), w.text]);
  return [...lines.entries()].sort(([a], [b]) => a - b).map(([, texts]) => texts.join(' '));
}

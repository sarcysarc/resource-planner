import { overlapsX } from './anchors';
import type { Box, Word } from './types';

// One OCR line from one pass, before the passes' lines are numbered together.
interface Row {
  words: Word[];
  y0: number;
  y1: number;
}

const overlaps = (a: Box, b: Box) => overlapsX(a, b) && a.y0 < b.y1 && b.y0 < a.y1;
const centre = (row: Row) => (row.y0 + row.y1) / 2;

function rows(words: Word[]): Row[] {
  const byLine = new Map<number, Word[]>();
  for (const w of words) byLine.set(w.line, [...(byLine.get(w.line) ?? []), w]);
  return [...byLine.values()].map((ws) => ({
    words: ws,
    y0: Math.min(...ws.map((w) => w.box.y0)),
    y1: Math.max(...ws.map((w) => w.box.y1)),
  }));
}

// Rows on the same line overlap by at least half the shorter one's height.
function sameLine(a: Row, b: Row): boolean {
  const shared = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return shared >= Math.min(a.y1 - a.y0, b.y1 - b.y0) / 2;
}

const join = (a: Row, b: Row): Row => ({ words: [...a.words, ...b.words], y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) });

function joinRows(all: Row[]): Row[] {
  const joined: Row[] = [];
  for (const row of [...all].sort((a, b) => centre(a) - centre(b))) {
    const last = joined.at(-1);
    if (last && sameLine(last, row)) joined[joined.length - 1] = join(last, row);
    else joined.push(row);
  }
  return joined;
}

/**
 * Words from two OCR passes over one screenshot: the dark-ink copy, which reads small
 * grey labels, and the plain image, which reads white text on coloured buttons. Where
 * both read the same spot, the dark-ink word wins. Lines are numbered top to bottom and
 * words run left to right, as one pass would give them.
 */
export function combinePasses(dark: Word[], plain: Word[]): Word[] {
  const extra = plain.filter((w) => !dark.some((d) => overlaps(d.box, w.box)));
  return joinRows([...rows(dark), ...rows(extra)])
    .flatMap((row, line) => [...row.words].sort((a, b) => a.box.x0 - b.box.x0).map((w) => ({ ...w, line })));
}

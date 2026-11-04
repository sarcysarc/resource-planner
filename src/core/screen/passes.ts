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

const conf = (w: Word) => w.conf ?? 0;
const mean = (ws: Word[]) => ws.reduce((sum, w) => sum + conf(w), 0) / ws.length;

// The spot a word sits in: the words of both passes over it, the words over those, and so on.
function spot(word: Word, all: Word[]): Set<Word> {
  let found = [word];
  for (let size = 0; size !== found.length; ) {
    size = found.length;
    found = all.filter((w) => w === word || found.some((f) => overlaps(f.box, w.box)));
  }
  return new Set(found);
}

// A word stays unless the other pass read its spot with more confidence. The spot is weighed
// whole, the same for every word in it, so a word split in one pass ("A5 ITAS") is weighed
// against the whole word from the other ("153/153") and each spot goes to one pass only.
function keeps(word: Word, [own, other]: Word[][], wins: boolean): boolean {
  const here = spot(word, [...own, ...other]);
  const rival = other.filter((w) => here.has(w));
  if (!rival.length) return true;
  const side = mean(own.filter((w) => here.has(w)));
  return wins ? side >= mean(rival) : side > mean(rival);
}

// Each pass's rows keep their own height, so a word keeps the line its pass gave it.
const kept = (own: Word[], other: Word[], wins: boolean): Row[] =>
  rows(own)
    .map((row) => ({ ...row, words: row.words.filter((w) => keeps(w, [own, other], wins)) }))
    .filter((row) => row.words.length);

/**
 * Words from two OCR passes over one screenshot: the dark-ink copy and the plain image.
 * Where both read the same spot, the more confident word wins, the first pass on a tie.
 * Lines are numbered top to bottom and words run left to right, as one pass would give them.
 */
export function combinePasses(dark: Word[], plain: Word[]): Word[] {
  return joinRows([...kept(dark, plain, true), ...kept(plain, dark, false)])
    .flatMap((row, line) => [...row.words].sort((a, b) => a.box.x0 - b.box.x0).map((w) => ({ ...w, line })));
}

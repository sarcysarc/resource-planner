// A grid per evolution line (ADR 0017). The page has one grid; opening a line keeps the
// open one in the book and shows the other's target, tiles and Candy in its place.
import type { Grid } from './grid';
import { restoreGrid, snapshotGrid } from './gridSave';
import { type LineCall, putLine, type SavedBook, type SavedLine } from './savedBook';

export interface LineParts {
  grid: Grid;
  target: HTMLInputElement;
  /** Holds the Candy and XL Candy fields, which belong to a line. */
  resources: ParentNode;
}

/** What step 2's list shows of a line. */
export interface LineSummary {
  family: string;
  target: string;
  count: number;
  open: boolean;
  /** Its call when last worked out. */
  call?: LineCall;
}

export interface Lines {
  /** The Candy family of the open line; '' before any is known. */
  family(): string;
  /** Shows this family's line, keeping the open one. */
  open(family: string): void;
  /** Every line with Pokémon in it, the open one as it is now. */
  book(): SavedBook;
  /** Each line with Pokémon in it, without saving the open one. */
  list(): LineSummary[];
  /** Shows a saved book's open line, or with none, forgets every line and shows an empty one. */
  use(book?: SavedBook): void;
  /** Keeps a line's call, shown in step 2's list. */
  setCall(family: string, call: LineCall): void;
  /** Forgets a line; when it was open, none is open after. */
  remove(family: string): void;
}

const OWN = ['candy', 'xl'] as const;
const field = (p: LineParts, name: string) => p.resources.querySelector<HTMLInputElement>(`[name="${name}"]`)!;

function snapshotLine(p: LineParts, { family, call }: Pick<SavedLine, 'family' | 'call'>): SavedLine {
  const own = Object.fromEntries(OWN.map((name) => [name, field(p, name).value]).filter(([, v]) => v));
  return { family, target: p.target.value, tiles: snapshotGrid(p.grid, '').tiles, ...own, ...(call ? { call } : {}) };
}

// Set as if typed, so the form lists follow the target before the tiles' values go in.
function showLine(p: LineParts, line: SavedLine | undefined): void {
  const setTarget = (name: string) => ((p.target.value = name), p.target.dispatchEvent(new Event('change')));
  p.grid.clear();
  restoreGrid(p.grid, { version: 1, target: line?.target ?? '', tiles: line?.tiles ?? [] }, setTarget);
  for (const name of OWN) field(p, name).value = line?.[name] ?? '';
}

const lineOf = (book: SavedBook, family: string) => book.lines.find((l) => l.family === family);

function withOpen(p: LineParts, book: SavedBook): SavedBook {
  const call = lineOf(book, book.open)?.call;
  const lines = putLine(book, snapshotLine(p, { family: book.open, call })).lines.filter((l) => l.tiles.length);
  return { ...book, lines };
}

function summaries(p: LineParts, book: SavedBook): LineSummary[] {
  const closed = book.lines.filter((l) => l.family !== book.open);
  const others = closed.map((l) => ({ family: l.family, target: l.target, count: l.tiles.length, open: false, call: l.call }));
  const open = { family: book.open, target: p.target.value, count: p.grid.roots().length, open: true, call: lineOf(book, book.open)?.call };
  return [...others, open].filter((l) => l.count);
}

// The book without a line; with none open when it was the open one.
function without(p: LineParts, book: SavedBook, family: string): SavedBook {
  const lines = withOpen(p, book).lines.filter((l) => l.family !== family);
  return { ...book, open: family === book.open ? '' : book.open, lines };
}

const EMPTY: SavedBook = { version: 2, open: '', lines: [] };

export function createLines(p: LineParts, saved = EMPTY): Lines {
  let book = saved;
  const use = (next = EMPTY) => ((book = next), showLine(p, lineOf(book, book.open)));
  use(saved);
  const open = (family: string) => {
    if (family === book.open) return;
    book = { ...withOpen(p, book), open: family };
    showLine(p, lineOf(book, family));
  };
  const setCall = (family: string, call: LineCall) => {
    const line = lineOf(book, family) ?? { family, target: '', tiles: [] };
    book = putLine(book, { ...line, call });
  };
  const remove = (family: string) => {
    book = without(p, book, family);
    if (!book.open) showLine(p, undefined);
  };
  const list = () => summaries(p, book);
  return { family: () => book.open, open, book: () => withOpen(p, book), list, use, setCall, remove };
}

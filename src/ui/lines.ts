// A grid per evolution line (ADR 0017). The page has one grid; opening a line keeps the
// open one in the book and shows the other's target, tiles and Candy in its place.
import type { Grid } from './grid';
import { restoreGrid, snapshotGrid } from './gridSave';
import { putLine, type SavedBook, type SavedLine } from './savedBook';

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
}

const OWN = ['candy', 'xl'] as const;
const field = (p: LineParts, name: string) => p.resources.querySelector<HTMLInputElement>(`[name="${name}"]`)!;

function snapshotLine(p: LineParts, family: string): SavedLine {
  const own = Object.fromEntries(OWN.map((name) => [name, field(p, name).value]).filter(([, v]) => v));
  return { family, target: p.target.value, tiles: snapshotGrid(p.grid, '').tiles, ...own };
}

// Set as if typed, so the form lists follow the target before the tiles' values go in.
function showLine(p: LineParts, line: SavedLine | undefined): void {
  const setTarget = (name: string) => ((p.target.value = name), p.target.dispatchEvent(new Event('change')));
  p.grid.clear();
  restoreGrid(p.grid, { version: 1, target: line?.target ?? '', tiles: line?.tiles ?? [] }, setTarget);
  for (const name of OWN) field(p, name).value = line?.[name] ?? '';
}

function withOpen(p: LineParts, book: SavedBook): SavedBook {
  const lines = putLine(book, snapshotLine(p, book.open)).lines.filter((l) => l.tiles.length);
  return { ...book, lines };
}

function summaries(p: LineParts, book: SavedBook): LineSummary[] {
  const closed = book.lines.filter((l) => l.family !== book.open);
  const others = closed.map((l) => ({ family: l.family, target: l.target, count: l.tiles.length, open: false }));
  const open = { family: book.open, target: p.target.value, count: p.grid.roots().length, open: true };
  return [...others, open].filter((l) => l.count);
}

const EMPTY: SavedBook = { version: 2, open: '', lines: [] };

export function createLines(p: LineParts, saved = EMPTY): Lines {
  let book = saved;
  const use = (next = EMPTY) => ((book = next), showLine(p, book.lines.find((l) => l.family === book.open)));
  use(saved);
  const open = (family: string) => {
    if (family === book.open) return;
    book = { ...withOpen(p, book), open: family };
    showLine(p, book.lines.find((l) => l.family === family));
  };
  return { family: () => book.open, open, book: () => withOpen(p, book), list: () => summaries(p, book), use };
}

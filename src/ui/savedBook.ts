// What is kept on the device once there is a grid per evolution line (ADR 0017): a book of
// lines, each with its target and tiles, and which one is open. A grid saved before lines
// (version 1) is read as one line.
import { z } from 'zod';
import type { KnownTile } from './poweredUp';
import { parseSaved, SavedTile, type SavedGrid } from './savedGrid';

const SavedLineSchema = z.object({
  /** The Candy family the line is for; '' for Pokémon typed in by hand before lines. */
  family: z.string(),
  target: z.string(),
  tiles: z.array(SavedTile),
  /** The line's own Candy and XL Candy, as typed. */
  candy: z.string().optional(),
  xl: z.string().optional(),
});

const SavedBookSchema = z.object({
  version: z.literal(2),
  /** The family of the line shown in step 2. */
  open: z.string(),
  lines: z.array(SavedLineSchema),
});

export type SavedLine = z.infer<typeof SavedLineSchema>;
export type SavedBook = z.infer<typeof SavedBookSchema>;

// The old grid held one line: its family is the one its tiles were read with.
function bookOf(grid: SavedGrid): SavedBook {
  if (!grid.tiles.length) return { version: 2, open: '', lines: [] };
  const family = grid.tiles.find((t) => t.marks?.family)?.marks?.family ?? '';
  return { version: 2, open: family, lines: [{ family, target: grid.target, tiles: grid.tiles }] };
}

/** The saved book, or undefined when there is none or it is not one this version can use. */
export function parseBook(value: unknown): SavedBook | undefined {
  const parsed = SavedBookSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  const old = parseSaved(value);
  return old && bookOf(old);
}

/** The fingerprints of every screenshot read into any line. */
export function printsOf(book: SavedBook): string[] {
  return book.lines.flatMap((l) => l.tiles.flatMap((t) => t.marks?.shots?.split(',') ?? []));
}

/** Every tile read with its IVs and CP, in any line; `nameOf` names its species. */
export function knownOf(book: SavedBook, nameOf: (id: string) => string | undefined): KnownTile[] {
  const tiles = book.lines.flatMap((l) => l.tiles);
  return tiles.flatMap(({ marks: m, chosen }) =>
    m?.family && m.ivs && m.cp ? [{ family: m.family, ivs: m.ivs, cp: Number(m.cp), name: chosen ? nameOf(chosen) : undefined }] : [],
  );
}

/** The book with this line in it, in place of the saved line of the same family. */
export function putLine(book: SavedBook, line: SavedLine): SavedBook {
  const at = book.lines.findIndex((l) => l.family === line.family);
  const lines = at < 0 ? [...book.lines, line] : book.lines.map((l, i) => (i === at ? line : l));
  return { ...book, lines };
}

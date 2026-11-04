import { describe, expect, it } from 'vitest';
import { parseBook, putLine, type SavedBook, type SavedLine } from '../../src/ui/savedBook';
import type { SavedGrid } from '../../src/ui/savedGrid';

const tile = (id: string, family?: string) => ({
  id, values: {}, current: id === 't1', transfer: false, known: [], ...(family ? { marks: { family } } : {}),
});
const aron: SavedLine = { family: 'FAMILY_ARON', target: 'Aggron', tiles: [tile('t1', 'FAMILY_ARON')] };
const book: SavedBook = { version: 2, open: 'FAMILY_ARON', lines: [aron] };

describe('parseBook', () => {
  it('accepts a saved book of lines', () => {
    expect(parseBook(book)).toEqual(book);
  });

  it('reads a grid saved before lines (version 1) as one line, open', () => {
    const old: SavedGrid = { version: 1, target: 'Aggron', tiles: [tile('t1'), tile('t2', 'FAMILY_ARON')] };
    expect(parseBook(old)).toEqual({ version: 2, open: 'FAMILY_ARON', lines: [{ family: 'FAMILY_ARON', target: 'Aggron', tiles: old.tiles }] });
  });

  it('keeps a version 1 grid typed in by hand, under no family', () => {
    const old: SavedGrid = { version: 1, target: '', tiles: [tile('t1')] };
    expect(parseBook(old)?.lines.map((l) => l.family)).toEqual(['']);
  });

  it('reads an empty version 1 grid as no lines', () => {
    expect(parseBook({ version: 1, target: '', tiles: [] })).toEqual({ version: 2, open: '', lines: [] });
  });

  it('drops anything else, or a line with a bad tile', () => {
    expect(parseBook(undefined)).toBeUndefined();
    expect(parseBook({ ...book, version: 3 })).toBeUndefined();
    expect(parseBook({ ...book, lines: [{ ...aron, tiles: [{ ...aron.tiles[0], thumb: 'javascript:x' }] }] })).toBeUndefined();
  });
});

describe('putLine', () => {
  const gastly: SavedLine = { family: 'FAMILY_GASTLY', target: 'Gengar', tiles: [] };

  it('adds a new line after the others', () => {
    expect(putLine(book, gastly).lines).toEqual([aron, gastly]);
  });

  it('replaces the line of the same family where it was', () => {
    const changed = { ...aron, target: 'Lairon' };
    expect(putLine({ ...book, lines: [aron, gastly] }, changed).lines).toEqual([changed, gastly]);
  });
});

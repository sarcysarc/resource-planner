import { describe, expect, it } from 'vitest';
import { knownOf, parseBook, printsOf, putLine, type SavedBook, type SavedLine } from '../../src/ui/savedBook';
import type { SavedGrid } from '../../src/ui/savedGrid';

const tile = (id: string, family?: string) => ({
  id, values: {}, current: id === 't1', transfer: false, known: [], ...(family ? { marks: { family } } : {}),
});
const aron: SavedLine = { family: 'FAMILY_ARON', target: 'Aggron', tiles: [tile('t1', 'FAMILY_ARON')] };
const book: SavedBook = { version: 2, open: 'FAMILY_ARON', lines: [aron] };

describe('what the book knows of its tiles', () => {
  const read = (id: string, marks: object, chosen?: string) => ({ ...tile(id), marks, chosen });
  const lines: SavedLine[] = [
    { family: 'A', target: '', tiles: [read('t1', { family: 'A', ivs: '1/2/3', cp: '500', shots: 'p1,p2' }, 'GYARADOS'), read('t2', { family: 'A', cp: '9' })] },
    { family: 'B', target: '', tiles: [read('t1', { family: 'B', ivs: '4/5/6', cp: '20', shots: 'p3' })] },
  ];
  const many: SavedBook = { version: 2, open: 'A', lines };

  it('lists the screenshots read into every line', () => {
    expect(printsOf(many)).toEqual(['p1', 'p2', 'p3']);
  });

  it('lists every tile read with its IVs and CP, named by its species', () => {
    expect(knownOf(many, (id) => (id === 'GYARADOS' ? 'Gyarados' : undefined))).toEqual([
      { family: 'A', ivs: '1/2/3', cp: 500, name: 'Gyarados' },
      { family: 'B', ivs: '4/5/6', cp: 20, name: undefined },
    ]);
  });
});

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

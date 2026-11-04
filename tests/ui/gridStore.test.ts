import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openGridStore } from '../../src/ui/gridStore';
import { parseSaved, type SavedGrid } from '../../src/ui/savedGrid';
import type { SavedBook } from '../../src/ui/savedBook';

const saved: SavedGrid = {
  version: 1,
  target: 'Dragonite',
  tiles: [
    { id: 't1', values: { cp: '900', atk: '15', lucky: true }, chosen: 'Dragonair', current: true, transfer: false, thumb: 'data:image/jpeg;base64,AA', known: ['cp'] },
    { id: 't2', values: {}, current: false, transfer: true, known: [] },
  ],
};

describe('parseSaved', () => {
  it('accepts a saved grid', () => {
    expect(parseSaved(saved)).toEqual(saved);
  });

  it('drops anything that is not a saved grid', () => {
    expect(parseSaved(undefined)).toBeUndefined();
    expect(parseSaved({ ...saved, version: 2 })).toBeUndefined();
    expect(parseSaved({ ...saved, tiles: [{ ...saved.tiles[0], id: '<b>' }] })).toBeUndefined();
  });

  it('keeps only JPEG thumbnails', () => {
    const bad = { ...saved, tiles: [{ ...saved.tiles[0], thumb: 'javascript:alert(1)' }] };
    expect(parseSaved(bad)).toBeUndefined();
  });
});

describe('openGridStore', () => {
  const book: SavedBook = { version: 2, open: 'FAMILY_DRATINI', lines: [{ family: 'FAMILY_DRATINI', target: 'Dragonite', tiles: saved.tiles }] };

  it('saves, loads and clears the lines', async () => {
    const store = openGridStore('test-grid');
    expect(await store.load()).toBeUndefined();
    await store.save(book);
    expect(await store.load()).toEqual(book);
    await store.clear();
    expect(await store.load()).toBeUndefined();
  });
});

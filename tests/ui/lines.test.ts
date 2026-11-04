// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createGrid, type Grid } from '../../src/ui/grid';
import { createLines, type Lines } from '../../src/ui/lines';
import type { SavedBook } from '../../src/ui/savedBook';

let grid: Grid;
let lines: Lines;
const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const value = (selector: string) => q<HTMLInputElement>(selector).value;
const cps = () => grid.roots().map((root) => root.querySelector('input')!.value);

const gengar = { id: 't1', values: { cp: '2000' }, current: true, transfer: false, known: ['cp'], marks: { family: 'FAMILY_GASTLY' } };
const saved: SavedBook = { version: 2, open: 'FAMILY_ARON', lines: [{ family: 'FAMILY_GASTLY', target: 'Gengar', tiles: [gengar], candy: '40' }] };

function addAron(cp: string): void {
  grid.add().querySelector('input')!.value = cp;
}

describe('lines', () => {
  beforeEach(() => {
    document.body.innerHTML = `<input id="target" /><div data-grid></div><div data-details></div><div data-transfers><ul></ul></div>
      <div data-resources><input name="candy" /><input name="xl" /><input name="stardust" /></div>`;
    grid = createGrid({
      parts: { grid: q('[data-grid]'), details: q('[data-details]'), transfer: q('[data-transfers]') },
      prepare: (root) => (root.innerHTML = '<legend></legend><input name="cp" />'),
      describe: () => ({ title: '', notes: [] }),
    });
    lines = createLines({ grid, target: q('#target'), resources: q('[data-resources]') }, saved);
    addAron('900');
    q<HTMLInputElement>('#target').value = 'Aggron';
    Object.assign(q<HTMLInputElement>('[name="candy"]'), { value: '120' });
    Object.assign(q<HTMLInputElement>('[name="stardust"]'), { value: '50000' });
  });

  it('opening another line keeps the open one and shows the other, with its own Candy', () => {
    lines.open('FAMILY_GASTLY');
    expect([lines.family(), cps(), value('#target'), value('[name="candy"]')]).toEqual(['FAMILY_GASTLY', ['2000'], 'Gengar', '40']);
    // Stardust is the account's, so it stays.
    expect(value('[name="stardust"]')).toBe('50000');
    lines.open('FAMILY_ARON');
    expect([cps(), value('#target'), value('[name="candy"]')]).toEqual([['900'], 'Aggron', '120']);
  });

  it('opens a line not seen before empty, with no target or Candy', () => {
    lines.open('FAMILY_MAGIKARP');
    expect([cps(), value('#target'), value('[name="candy"]'), value('[name="xl"]')]).toEqual([[], '', '', '']);
  });

  it('opening the open line changes nothing', () => {
    const root = grid.roots()[0];
    lines.open('FAMILY_ARON');
    expect(grid.roots()[0]).toBe(root);
  });

  it('gives the book with the open line as it is now, leaving out lines with no Pokémon', () => {
    const book = lines.book();
    expect(book.open).toBe('FAMILY_ARON');
    expect(book.lines.map((l) => [l.family, l.target, l.tiles.length, l.candy])).toEqual([
      ['FAMILY_GASTLY', 'Gengar', 1, '40'],
      ['FAMILY_ARON', 'Aggron', 1, '120'],
    ]);
    lines.open('FAMILY_MAGIKARP');
    expect(lines.book().lines.map((l) => l.family)).toEqual(['FAMILY_GASTLY', 'FAMILY_ARON']);
  });

  it('starts again from nothing', () => {
    lines.use();
    expect([lines.family(), lines.book().lines, cps()]).toEqual(['', [], []]);
  });
});

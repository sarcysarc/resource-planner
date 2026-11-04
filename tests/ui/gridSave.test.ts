// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGrid, type Grid } from '../../src/ui/grid';
import { restoreGrid, snapshotGrid } from '../../src/ui/gridSave';
import type { SavedGrid } from '../../src/ui/savedGrid';

let grid: Grid;
const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const FIELDS = '<legend></legend><input name="cp" /><input name="lucky" type="checkbox" /><select name="form"></select><select name="fast"></select>';

const saved: SavedGrid = {
  version: 1,
  target: 'Dragonite',
  tiles: [
    { id: 't2', values: { cp: '900', lucky: true, form: 'b', fast: 'DRAGON_BREATH' }, chosen: 'b', current: false, transfer: true, thumb: 'data:image/jpeg;base64,AA', known: ['cp'],
      marks: { cp: '900', hp: '120', family: 'FAMILY_DRATINI', edited: 'fast', shots: 'ba7816bf8f01cfea414140de5dae2223', ivs: '1/2/3', alike: '4/5/6' } },
    { id: 't5', values: { cp: '1200', lucky: false, form: 'c', fast: '' }, current: true, transfer: false, known: [] },
  ],
};

describe('saving the grid', () => {
  beforeEach(() => {
    document.body.innerHTML = '<input id="target" /><div data-grid></div><div data-details></div><div data-transfers><ul></ul></div>';
    grid = createGrid({
      parts: { grid: q('[data-grid]'), details: q('[data-details]'), transfer: q('[data-transfers]') },
      prepare: (root) => (root.innerHTML = FIELDS),
      describe: (root) => ({ title: `CP ${root.querySelector('input')!.value}`, notes: [] }),
    });
  });

  // Like the app: the target fills each form list.
  const setTarget = vi.fn((name: string) => {
    q<HTMLInputElement>('#target').value = name;
    for (const select of document.querySelectorAll<HTMLSelectElement>('[name="form"]')) {
      select.replaceChildren(...['a', 'b', 'c'].map((id) => new Option(id, id)));
    }
  });

  it('restores every tile, its marks, thumbnail and values, then saves the same again', () => {
    restoreGrid(grid, saved, setTarget);
    expect(setTarget).toHaveBeenCalledWith('Dragonite');
    expect(grid.roots().map((r) => r.dataset.tile)).toEqual(['t2', 't5']);
    const [first] = grid.roots();
    expect(first.querySelector<HTMLSelectElement>('[name="fast"]')!.value).toBe('DRAGON_BREATH');
    // What finds the tile again for a later screenshot, and what the player fixed by hand.
    expect([first.dataset.cp, first.dataset.family, first.dataset.edited]).toEqual(['900', 'FAMILY_DRATINI', 'fast']);
    expect(grid.tileOf(first).querySelector('[data-title]')!.textContent).toBe('CP 900');
    expect(grid.add().dataset.tile).toBe('t6');
    grid.roots()[2].remove();
    q('[data-grid] .tile:last-child').remove();
    expect(snapshotGrid(grid, 'Dragonite')).toEqual(saved);
  });

  it('starts empty when nothing was saved', () => {
    restoreGrid(grid, undefined, setTarget);
    expect(grid.roots()).toEqual([]);
    expect(snapshotGrid(grid, '')).toEqual({ version: 1, target: '', tiles: [] });
  });
});

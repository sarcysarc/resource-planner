// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createGrid, type Grid } from '../../src/ui/grid';

let grid: Grid;
const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const tile = (root: HTMLElement) => q(`.tile[data-tile="${root.dataset.tile}"]`);

function check(input: HTMLInputElement, on = true): void {
  input.checked = on;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('createGrid', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div data-grid></div><div data-details></div><div data-transfers hidden><ul></ul></div>';
    grid = createGrid({
      parts: { grid: q('[data-grid]'), details: q('[data-details]'), transfer: q('[data-transfers]') },
      prepare: (root) => (root.innerHTML = '<legend></legend><input name="cp" />'),
      describe: (root) => ({ title: `CP ${root.querySelector('input')!.value}`, notes: [] }),
    });
  });

  it('adds a tile and its hidden details, and makes the first one current', () => {
    const a = grid.add();
    const b = grid.add();
    expect(grid.roots()).toEqual([a, b]);
    expect([a.hidden, b.hidden]).toEqual([true, true]);
    expect(a.matches('fieldset[data-candidate]')).toBe(true);
    expect(tile(a).querySelector<HTMLInputElement>('[name="currentTile"]')!.checked).toBe(true);
    expect(tile(b).querySelector<HTMLInputElement>('[name="currentTile"]')!.checked).toBe(false);
  });

  it('opens one tile’s details at a time when its tile is tapped', () => {
    const a = grid.add();
    const b = grid.add();
    tile(b).querySelector<HTMLButtonElement>('.tile-open')!.click();
    expect([a.hidden, b.hidden]).toEqual([true, false]);
    expect(tile(b).classList.contains('open')).toBe(true);
    grid.open(a);
    expect([a.hidden, b.hidden]).toEqual([false, true]);
  });

  it('updates the tile and its legend when its details change', () => {
    const a = grid.add();
    const cp = a.querySelector('input')!;
    cp.value = '900';
    cp.dispatchEvent(new Event('change', { bubbles: true }));
    expect(tile(a).querySelector('[data-title]')!.textContent).toBe('CP 900');
    expect(a.querySelector('legend')!.textContent).toBe('CP 900');
  });

  it('compares the current one first and leaves out those marked for transfer', () => {
    const [a, b, c] = [grid.add(), grid.add(), grid.add()];
    check(tile(c).querySelector('[name="currentTile"]')!);
    check(tile(b).querySelector('[data-transfer]')!);
    expect(grid.compared()).toEqual([c, a]);
    const list = q('[data-transfers]');
    expect([list.hidden, list.querySelector('li')!.textContent]).toEqual([false, 'CP ']);
  });

  it('takes the first unmarked Pokémon as current when the current one is marked', () => {
    const [a, b] = [grid.add(), grid.add()];
    check(tile(a).querySelector('[data-transfer]')!);
    expect(grid.compared()).toEqual([b]);
  });

  it('labels suggestions and clears the old ones', () => {
    const [a, b] = [grid.add(), grid.add()];
    grid.suggest(new Map([[a.dataset.tile!, 'Weaker.']]));
    grid.suggest(new Map([[b.dataset.tile!, 'Weaker.']]));
    expect([tile(a).querySelector<HTMLElement>('[data-could]')!.hidden, tile(b).querySelector<HTMLElement>('[data-could]')!.hidden]).toEqual([true, false]);
  });

  it('keeps a given id, never reuses one, and empties everything on clear', () => {
    const kept = grid.add('t7');
    expect(kept.dataset.tile).toBe('t7');
    expect(grid.add().dataset.tile).toBe('t8');
    grid.clear();
    expect(grid.roots()).toEqual([]);
    expect(q('[data-grid]').children).toHaveLength(0);
    expect(q('[data-transfers]').hidden).toBe(true);
  });
});

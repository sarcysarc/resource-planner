// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGrid, type Grid } from '../../src/ui/grid';
import { persistGrid } from '../../src/ui/gridPersist';
import { openGridStore } from '../../src/ui/gridStore';

let grid: Grid;
const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const parts = () => ({ grid: q('[data-grid]'), details: q('[data-details]'), transfer: q('[data-transfers]') });
const restored = vi.fn();
const cleared = vi.fn();
const persist = (store = openGridStore(`t${Math.random()}`)) =>
  persistGrid({ grid, target: q('#target'), area: q('main'), onRestore: restored, onClear: cleared }, store);

describe('persistGrid', () => {
  beforeEach(() => {
    document.body.innerHTML = `<main><input id="target" />
      <div data-grid></div><div data-details></div><div data-transfers hidden><ul></ul></div>
      <button type="button" data-clear-grid>Clear all</button><button type="button" data-clear-grid id="early">Clear</button></main>`;
    restored.mockClear();
    cleared.mockClear();
    grid = createGrid({ parts: parts(), prepare: (root) => (root.innerHTML = '<legend></legend><input name="cp" />'), describe: () => ({ title: '', notes: [] }) });
  });

  it('saves after a change and restores on the next visit', async () => {
    const store = openGridStore(`t${Math.random()}`);
    const save = persist(store);
    grid.add().querySelector('input')!.value = '900';
    q<HTMLInputElement>('#target').value = 'Dragonite';
    save();
    await vi.waitFor(async () => expect((await store.load())?.tiles).toHaveLength(1), { timeout: 2000 });
    grid.clear();
    persist(store);
    await vi.waitFor(() => expect(grid.roots()).toHaveLength(1));
    expect([q<HTMLInputElement>('#target').value, grid.roots()[0].querySelector('input')!.value]).toEqual(['Dragonite', '900']);
  });

  it('clears the grid and the device only when the player confirms', async () => {
    const store = openGridStore(`t${Math.random()}`);
    await store.save({ version: 1, target: 'Dragonite', tiles: [] });
    persist(store);
    grid.add();
    q<HTMLInputElement>('#target').value = 'Dragonite';
    vi.stubGlobal('confirm', () => false);
    q('[data-clear-grid]').click();
    expect(grid.roots()).toHaveLength(1);
    vi.stubGlobal('confirm', () => true);
    q('[data-clear-grid]').click();
    expect(grid.roots()).toHaveLength(0);
    // Starting again: the next screenshots pick the target afresh.
    expect(q<HTMLInputElement>('#target').value).toBe('');
    await vi.waitFor(async () => expect(await store.load()).toBeUndefined());
    vi.unstubAllGlobals();
  });

  it('tells what it restored, and only when there was something', async () => {
    const store = openGridStore(`t${Math.random()}`);
    persist(store);
    await store.save({ version: 1, target: 'Gengar', tiles: [] });
    await new Promise((r) => setTimeout(r, 50));
    expect(restored).not.toHaveBeenCalled();
    grid.add();
    persist(store)();
    await vi.waitFor(async () => expect((await store.load())?.tiles).toHaveLength(1), { timeout: 2000 });
    grid.clear();
    persist(store);
    await vi.waitFor(() => expect(restored).toHaveBeenCalledWith({ target: 'Gengar', count: 1 }));
  });

  it('clears from every Clear button, and says so', () => {
    persist();
    grid.add();
    vi.stubGlobal('confirm', () => true);
    q('#early').click();
    expect(grid.roots()).toHaveLength(0);
    expect(cleared).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('works without a store', () => {
    const save = persistGrid({ grid, target: q('#target'), area: q('main') }, undefined);
    expect(save).not.toThrow();
  });
});

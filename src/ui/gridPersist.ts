// Keeps the grid between visits (ADR 0015): restored when the page opens, saved shortly
// after each change, and removed by Clear all.
import type { Grid } from './grid';
import { restoreGrid, snapshotGrid } from './gridSave';
import type { SavedGrid } from './savedGrid';
import { type GridStore, openGridStore } from './gridStore';
import type { SavedSummary } from './steps';

export interface Persist {
  grid: Grid;
  target: HTMLInputElement;
  /** Where changes are listened for, and where the Clear all button is. */
  area: HTMLElement;
  /** After a grid with Pokémon in it was restored. */
  onRestore?: (saved: SavedSummary) => void;
  /** After the player cleared everything. */
  onClear?: () => void;
}

const WAIT_MS = 500;
const ASK = 'Remove every Pokémon from the grid, and from this device?';

// Private browsing can have no IndexedDB; then nothing is kept.
export function openStore(): GridStore | undefined {
  try {
    return openGridStore();
  } catch {
    return undefined;
  }
}

function wireClear(p: Persist, store: GridStore | undefined): void {
  const clear = () => {
    if (!p.area.ownerDocument.defaultView!.confirm(ASK)) return;
    p.grid.clear();
    p.target.value = '';
    p.target.dispatchEvent(new Event('change'));
    void store?.clear().catch(() => undefined);
    p.onClear?.();
  };
  p.area.querySelectorAll('[data-clear-grid]').forEach((button) => button.addEventListener('click', clear));
}

/** Restores the saved grid, then saves it after each change. Returns a save to call after other updates. */
export function persistGrid(p: Persist, store: GridStore | undefined): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void store?.save(snapshotGrid(p.grid, p.target.value)).catch(() => undefined), WAIT_MS);
  };
  const setTarget = (name: string) => ((p.target.value = name), p.target.dispatchEvent(new Event('change')));
  const restore = (saved: SavedGrid | undefined) => {
    restoreGrid(p.grid, saved, setTarget);
    if (saved?.tiles.length) p.onRestore?.({ target: saved.target, count: saved.tiles.length });
  };
  void store?.load().then(restore).catch(() => undefined);
  p.area.addEventListener('change', save);
  p.area.addEventListener('input', save);
  wireClear(p, store);
  return save;
}

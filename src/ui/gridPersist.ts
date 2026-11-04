// Keeps the grid between visits (ADR 0015): restored when the page opens, saved shortly
// after each change, and removed by Clear all. What is kept is every line (ADR 0017).
import type { Grid } from './grid';
import { type GridStore, openGridStore } from './gridStore';
import { createLines, type Lines } from './lines';
import type { SavedBook } from './savedBook';
import type { SavedSummary } from './steps';

export interface Persist {
  grid: Grid;
  target: HTMLInputElement;
  /** Holds the Candy fields, which each line keeps. */
  resources: ParentNode;
  /** Where changes are listened for, and where the Clear all button is. */
  area: HTMLElement;
  /** After lines with Pokémon in them were restored. */
  onRestore?: (saved: SavedSummary) => void;
  /** After the player cleared everything. */
  onClear?: () => void;
}

export interface Persisted {
  lines: Lines;
  /** Saves shortly; call after updates that fire no change event. */
  save: () => void;
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

function wireClear(p: Persist, lines: Lines, store: GridStore | undefined): void {
  const clear = () => {
    if (!p.area.ownerDocument.defaultView!.confirm(ASK)) return;
    lines.use();
    void store?.clear().catch(() => undefined);
    p.onClear?.();
  };
  p.area.querySelectorAll('[data-clear-grid]').forEach((button) => button.addEventListener('click', clear));
}

function restore(p: Persist, lines: Lines, saved: SavedBook | undefined): void {
  if (!saved) return;
  lines.use(saved);
  const count = saved.lines.reduce((n, line) => n + line.tiles.length, 0);
  const open = saved.lines.find((line) => line.family === saved.open);
  if (count) p.onRestore?.({ target: open?.target ?? '', count });
}

/** Restores the saved lines, then saves them after each change. */
export function persistGrid(p: Persist, store: GridStore | undefined): Persisted {
  const lines = createLines(p);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void store?.save(lines.book()).catch(() => undefined), WAIT_MS);
  };
  void store?.load().then((saved) => restore(p, lines, saved)).catch(() => undefined);
  p.area.addEventListener('change', save);
  p.area.addEventListener('input', save);
  wireClear(p, lines, store);
  return { lines, save };
}

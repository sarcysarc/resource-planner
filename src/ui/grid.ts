// The grid of Pokémon from one line (ADR 0015). Each tile owns a hidden candidate
// fieldset; tapping the tile shows its details, one at a time. The current tile and the
// tiles marked for transfer decide what is compared.
import { buildTile, isMarked, showProblem, showSuggestion, showTile, type TileView } from './tileView';

export interface GridParts {
  /** Where the tiles go. */
  grid: HTMLElement;
  /** Where each tile's fieldset goes. */
  details: HTMLElement;
  /** Lists the tiles marked for transfer; holds a `ul`. */
  transfer: HTMLElement;
}

export interface GridWiring {
  parts: GridParts;
  /** Builds and wires a new tile's fields. */
  prepare: (root: HTMLElement) => void;
  /** What a tile shows, from its fields. */
  describe: (root: HTMLElement) => TileView;
}

export interface Grid {
  /** A new tile; `id` restores a saved one. Returns its fieldset. */
  add(id?: string): HTMLElement;
  roots(): HTMLElement[];
  /** What to compare: the current one first, those marked for transfer left out. */
  compared(): HTMLElement[];
  open(root: HTMLElement): void;
  /** Marks this tile with what stops the comparison and opens it, unmarking the rest; none unmarks all (issue #10). */
  mark(root?: HTMLElement, problem?: string): void;
  /** Redraws a tile from its fields, or every tile. */
  refresh(root?: HTMLElement): void;
  /** Labels these tiles "Could transfer" with their reasons, and no others. */
  suggest(reasons: ReadonlyMap<string, string>): void;
  tileOf(root: HTMLElement): HTMLElement;
  clear(): void;
}

const tiles = (parts: GridParts) => [...parts.grid.querySelectorAll<HTMLElement>('.tile')];
const isCurrent = (tile: HTMLElement) => tile.querySelector<HTMLInputElement>('[name="currentTile"]')!.checked;

function listTransfers(w: GridWiring, roots: HTMLElement[], tileOf: Grid['tileOf']): void {
  const marked = roots.filter((root) => isMarked(tileOf(root)));
  const items = marked.map((root) => Object.assign(root.ownerDocument.createElement('li'), { textContent: w.describe(root).title }));
  w.parts.transfer.querySelector('ul')!.replaceChildren(...items);
  w.parts.transfer.hidden = !items.length;
}

function compared(roots: HTMLElement[], tileOf: Grid['tileOf']): HTMLElement[] {
  const kept = roots.filter((root) => !isMarked(tileOf(root)));
  const current = kept.find((root) => isCurrent(tileOf(root))) ?? kept[0];
  return current ? [current, ...kept.filter((root) => root !== current)] : [];
}

function newFieldset(w: GridWiring, id: string): HTMLElement {
  const root = w.parts.details.ownerDocument.createElement('fieldset');
  Object.assign(root, { className: 'card', hidden: true });
  Object.assign(root.dataset, { candidate: '', tile: id });
  w.parts.details.append(root);
  w.prepare(root);
  return root;
}

function open(w: GridWiring, root: HTMLElement): void {
  for (const r of w.parts.details.querySelectorAll<HTMLElement>('[data-tile]')) r.hidden = r !== root;
  for (const t of tiles(w.parts)) t.classList.toggle('open', t.dataset.tile === root.dataset.tile);
}

function wireEvents(w: GridWiring, grid: Grid): void {
  w.parts.grid.addEventListener('click', (event) => {
    const id = (event.target as Element).closest('.tile-open')?.closest<HTMLElement>('.tile')?.dataset.tile;
    const root = grid.roots().find((r) => r.dataset.tile === id);
    if (root) grid.open(root);
  });
  w.parts.grid.addEventListener('change', () => listTransfers(w, grid.roots(), grid.tileOf));
  w.parts.details.addEventListener('change', (event) => {
    const root = (event.target as Element).closest<HTMLElement>('[data-tile]');
    if (!root) return;
    // A changed detail may fix the problem; it is checked again on Compare.
    showProblem(grid.tileOf(root), undefined);
    grid.refresh(root);
  });
}

function mark(grid: Grid, root?: HTMLElement, problem?: string): void {
  for (const r of grid.roots()) showProblem(grid.tileOf(r), r === root ? problem : undefined);
  if (root) grid.open(root);
}

interface Ctx {
  w: GridWiring;
  roots: () => HTMLElement[];
  tileOf: Grid['tileOf'];
}

function redraw({ w, tileOf }: Ctx, root: HTMLElement): void {
  const view = w.describe(root);
  showTile(tileOf(root), view);
  root.querySelector('legend')!.textContent = view.title;
}

function addTile(ctx: Ctx, id: string): HTMLElement {
  const { parts } = ctx.w;
  const tile = buildTile(parts.grid.ownerDocument, id);
  parts.grid.append(tile);
  const root = newFieldset(ctx.w, id);
  if (!tiles(parts).some(isCurrent)) tile.querySelector<HTMLInputElement>('[name="currentTile"]')!.checked = true;
  redraw(ctx, root);
  return root;
}

export function createGrid(w: GridWiring): Grid {
  let next = 1;
  const roots = () => [...w.parts.details.querySelectorAll<HTMLElement>(':scope > [data-tile]')];
  const tileOf = (root: HTMLElement) => w.parts.grid.querySelector<HTMLElement>(`.tile[data-tile="${root.dataset.tile}"]`)!;
  const ctx = { w, roots, tileOf };
  const grid: Grid = {
    add: (id = `t${next}`) => ((next = Math.max(next, Number(id.slice(1)) + 1)), addTile(ctx, id)),
    roots,
    compared: () => compared(roots(), tileOf),
    open: (root) => open(w, root),
    mark: (root, problem) => mark(grid, root, problem),
    refresh: (root) => ((root ? [root] : roots()).forEach((r) => redraw(ctx, r)), listTransfers(w, roots(), tileOf)),
    suggest: (reasons) => tiles(w.parts).forEach((t) => showSuggestion(t, reasons.get(t.dataset.tile!))),
    tileOf,
    clear: () => (w.parts.grid.replaceChildren(), w.parts.details.replaceChildren(), listTransfers(w, [], tileOf)),
  };
  wireEvents(w, grid);
  return grid;
}

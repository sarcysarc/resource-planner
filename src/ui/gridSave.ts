// Turns the grid into what is saved on the device and back (ADR 0015).
import { fieldValues } from './form';
import type { Grid } from './grid';
import type { SavedGrid, SavedTile } from './savedGrid';
import { isMarked, setThumb } from './tileView';

const formSelect = (root: ParentNode) => root.querySelector<HTMLSelectElement>('select[name="form"]');
const currentMark = (tile: Element) => tile.querySelector<HTMLInputElement>('[name="currentTile"]')!;
const transferMark = (tile: Element) => tile.querySelector<HTMLInputElement>('[data-transfer]')!;
const MARKS = ['cp', 'hp', 'family', 'ivs', 'edited', 'shots', 'alike'] as const;

// What finds the tile for a later screenshot (see tileFill), and what was fixed by hand.
function marksOf(root: HTMLElement): SavedTile['marks'] {
  const marks = Object.fromEntries(MARKS.filter((m) => root.dataset[m]).map((m) => [m, root.dataset[m]!]));
  return Object.keys(marks).length ? marks : undefined;
}

function snapshotTile(grid: Grid, root: HTMLElement): SavedTile {
  const tile = grid.tileOf(root);
  const thumb = tile.querySelector('img')!;
  return {
    id: root.dataset.tile!,
    values: fieldValues(root),
    chosen: formSelect(root)?.dataset.chosen,
    current: currentMark(tile).checked,
    transfer: isMarked(tile),
    thumb: thumb.hidden ? undefined : thumb.getAttribute('src') ?? undefined,
    known: root.dataset.known ? root.dataset.known.split(',') : [],
    marks: marksOf(root),
  };
}

export function snapshotGrid(grid: Grid, target: string): SavedGrid {
  return { version: 1, target, tiles: grid.roots().map((root) => snapshotTile(grid, root)) };
}

// A select whose choices come later (moves load with the species) keeps the saved one.
function setValue(field: HTMLInputElement | HTMLSelectElement, value: string | boolean): void {
  if (field instanceof HTMLInputElement && field.type === 'checkbox') field.checked = value === true;
  else if (field instanceof HTMLSelectElement && ![...field.options].some((o) => o.value === value)) field.add(new Option(String(value), String(value)));
  if (typeof value === 'string') field.value = value;
}

function setValues(root: HTMLElement, values: SavedTile['values']): void {
  for (const field of root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[name], select[name]')) {
    if (Object.hasOwn(values, field.name)) setValue(field, values[field.name]);
  }
}

function addTile(grid: Grid, saved: SavedTile): HTMLElement {
  const root = grid.add(saved.id);
  const tile = grid.tileOf(root);
  currentMark(tile).checked = saved.current;
  transferMark(tile).checked = saved.transfer;
  setThumb(tile, saved.thumb);
  root.dataset.known = saved.known.join(',');
  Object.assign(root.dataset, saved.marks);
  const form = formSelect(root);
  if (form && saved.chosen) form.dataset.chosen = saved.chosen;
  return root;
}

/** Rebuilds a saved grid. `setTarget` sets the target as if typed, so the form lists fill first. */
export function restoreGrid(grid: Grid, saved: SavedGrid | undefined, setTarget: (name: string) => void): void {
  if (!saved) return;
  const roots = saved.tiles.map((tile) => addTile(grid, tile));
  setTarget(saved.target);
  roots.forEach((root, i) => setValues(root, saved.tiles[i].values));
  grid.refresh();
}

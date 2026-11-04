// Puts one Pokémon read from screenshots into the grid (ADR 0015): into the tile it
// already has, or a new one. What the player fixed by hand is kept.
import type { FamilyOf, Group } from '../core/screen/merge';
import type { Reading } from '../core/screen/types';
import type { Grid } from './grid';
import { fillCandidate } from './screenshot';
import { markKnown } from './tileDescribe';
import { matchTile, type TileKey } from './tileMatch';

export interface TileFill {
  grid: Grid;
  familyOf: FamilyOf;
  /** After a tile is filled: the species, the evolve Candy and the shared totals. */
  onRead: (root: HTMLElement, reading: Reading) => void;
}

type Field = HTMLInputElement | HTMLSelectElement;
const editedOf = (root: HTMLElement) => (root.dataset.edited ? root.dataset.edited.split(',') : []);
const fieldOf = (root: HTMLElement, name: string) => root.querySelector<Field>(`[name="${name}"]`)!;
const number = (text?: string) => (text ? Number(text) : undefined);

/** Records each field the player types in or ticks, on every tile under `area`. */
export function trackEdits(area: HTMLElement): void {
  area.addEventListener('input', (event) => {
    const name = (event.target as Field).name;
    const root = (event.target as Element).closest<HTMLElement>('[data-tile]');
    if (!root || !name) return;
    root.dataset.edited = [...new Set([...editedOf(root), name])].join(',');
    markKnown(root, [name]);
  });
}

const keyOf = (root: HTMLElement): TileKey => ({ id: root.dataset.tile!, cp: number(root.dataset.cp), hp: number(root.dataset.hp), family: root.dataset.family });

// A Pokémon screen (its Stardust or move list) shows the Shadow and Lucky labels if they apply.
// Its own evolve Candy on screen is marked as evolveStep, so the tile asks for the next form's.
function readFields({ variant, lucky, secondMove, dust, evolveCandy }: Reading): string[] {
  const screen = dust !== undefined || secondMove !== undefined;
  const fields = [variant || screen ? 'variant' : '', lucky || screen ? 'lucky' : ''];
  const read = [secondMove === undefined ? '' : 'secondMove', evolveCandy === undefined ? '' : 'evolveStep'];
  return [...fields, ...read].filter(Boolean);
}

function remember(root: HTMLElement, reading: Reading, family?: string): void {
  const keys = { cp: reading.cp, hp: reading.hp, family };
  for (const [key, value] of Object.entries(keys)) if (value !== undefined && !root.dataset[key]) root.dataset[key] = String(value);
  markKnown(root, readFields(reading));
}

function fillKeepingEdits(root: HTMLElement, group: Group): void {
  const kept = editedOf(root).map((name) => [fieldOf(root, name), fieldOf(root, name).value, (fieldOf(root, name) as HTMLInputElement).checked] as const);
  fillCandidate(root, group);
  for (const [field, value, checked] of kept) Object.assign(field, field.type === 'checkbox' ? { checked } : { value });
}

/** Fills the tile this Pokémon belongs to, adding one if it is new. Returns its fieldset. */
export function fillTile({ grid, familyOf, onRead }: TileFill, group: Group): HTMLElement {
  const id = matchTile(grid.roots().map(keyOf), group.reading, familyOf);
  const root = grid.roots().find((r) => r.dataset.tile === id) ?? grid.add();
  fillKeepingEdits(root, group);
  remember(root, group.reading, familyOf(group.reading));
  onRead(root, group.reading);
  grid.refresh(root);
  return root;
}

// Puts one Pokémon read from screenshots into the grid (ADR 0015): into the tile it
// already has, or a new one. What the player fixed by hand is kept.
import type { FamilyOf, Group } from '../core/screen/merge';
import type { Reading } from '../core/screen/types';
import type { Grid } from './grid';
import { fillCandidate } from './screenshot';
import { markKnown } from './tileDescribe';
import { tileOf } from './tileFind';
import { ivsText } from './tileMatch';

export interface TileFill {
  grid: Grid;
  familyOf: FamilyOf;
  /** After a tile is filled: the species, the evolve Candy and the shared totals. */
  onRead: (root: HTMLElement, reading: Reading) => void;
}

type Field = HTMLInputElement | HTMLSelectElement;
const editedOf = (root: HTMLElement) => (root.dataset.edited ? root.dataset.edited.split(',') : []);
const fieldOf = (root: HTMLElement, name: string) => root.querySelector<Field>(`[name="${name}"]`)!;

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

// A Pokémon screen (its Stardust or move list) shows the Shadow and Lucky labels if they apply.
// Its own evolve Candy on screen is marked as evolveStep, so the tile asks for the next form's.
// Its HP shows on its top screen, whose sky is read for Shadow (issue #13).
function readFields({ variant, lucky, secondMove, dust, evolveCandy, hp }: Reading): string[] {
  const screen = dust !== undefined || secondMove !== undefined;
  const fields = [variant || screen ? 'variant' : '', lucky || screen ? 'lucky' : '', hp === undefined ? '' : 'shadow'];
  const read = [secondMove === undefined ? '' : 'secondMove', evolveCandy === undefined ? '' : 'evolveStep'];
  return [...fields, ...read].filter(Boolean);
}

function remember(root: HTMLElement, reading: Reading, family?: string): void {
  const keys = { cp: reading.cp, hp: reading.hp, family, ivs: ivsText(reading.ivs) };
  for (const [key, value] of Object.entries(keys)) if (value !== undefined && !root.dataset[key]) root.dataset[key] = String(value);
  markKnown(root, readFields(reading));
}

// The screenshots it was read from, so the same files shared again are skipped (ADR 0017).
function rememberShots(root: HTMLElement, prints: readonly string[]): void {
  const shots = new Set([...(root.dataset.shots?.split(',') ?? []), ...prints]);
  if (shots.size) root.dataset.shots = [...shots].join(',');
}

function fillKeepingEdits(root: HTMLElement, group: Group): void {
  const kept = editedOf(root).map((name) => [fieldOf(root, name), fieldOf(root, name).value, (fieldOf(root, name) as HTMLInputElement).checked] as const);
  fillCandidate(root, group);
  for (const [field, value, checked] of kept) Object.assign(field, field.type === 'checkbox' ? { checked } : { value });
}

/** Fills the tile this Pokémon belongs to, adding one if it is new. Returns its fieldset. */
export function fillTile({ grid, familyOf, onRead }: TileFill, group: Group, prints: readonly string[] = []): HTMLElement {
  const root = tileOf(grid, group, familyOf);
  fillKeepingEdits(root, group);
  remember(root, group.reading, familyOf(group.reading));
  rememberShots(root, prints);
  onRead(root, group.reading);
  grid.refresh(root);
  return root;
}

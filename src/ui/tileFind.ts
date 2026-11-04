// Which tile a Pokémon read from screenshots goes into (ADR 0015, 0017): the one it fits,
// the one it was before it was powered up or evolved, or a new one.
import type { FamilyOf, Group } from '../core/screen/merge';
import type { Grid } from './grid';
import { matchTiles, type TileKey } from './tileMatch';

const number = (text?: string) => (text ? Number(text) : undefined);
const keyOf = ({ dataset: d }: HTMLElement): TileKey => ({ id: d.tile!, cp: number(d.cp), hp: number(d.hp), family: d.family, ivs: d.ivs });

// A screenshot without IVs that fits look-alikes joins the first; it notes the others' IVs.
function noteAlike(root: HTMLElement, keys: readonly TileKey[], ids: readonly string[]): void {
  const others = keys.filter((k) => ids.includes(k.id) && k.id !== root.dataset.tile && k.ivs);
  if (others.length) root.dataset.alike = others.map((k) => k.ivs).join(' or ');
}

/** The tile this Pokémon goes into, added if it is new. */
export function tileOf(grid: Grid, group: Group, familyOf: FamilyOf): HTMLElement {
  const before = group.was === undefined ? group.reading : { ...group.reading, cp: group.was, hp: undefined };
  const keys = grid.roots().map(keyOf);
  const ids = matchTiles(keys, before, familyOf);
  const root = grid.roots().find((r) => r.dataset.tile === ids[0]) ?? grid.add();
  // Powered up or evolved: it takes the new CP and HP.
  if (group.was !== undefined) for (const key of ['cp', 'hp']) delete root.dataset[key];
  if (!group.reading.ivs) noteAlike(root, keys, ids);
  return root;
}

// Screenshots added later join the tile they show (ADR 0015), by the same rules that
// group screenshots read together: CP and HP agree and the Candy families don't clash.
import type { FamilyOf } from '../core/screen/merge';
import type { Reading } from '../core/screen/types';

/** What a tile was read as, to recognise it in a later screenshot. */
export interface TileKey {
  id: string;
  cp?: number;
  hp?: number;
  family?: string;
}

const agrees = (a?: number, b?: number) => a === undefined || b === undefined || a === b;
const shares = (a?: number, b?: number) => a !== undefined && b !== undefined;
const sameFamily = (a?: string, b?: string) => a === undefined || b === undefined || a === b;

function sameNumbers(tile: TileKey, reading: Reading): boolean {
  const shared = shares(tile.cp, reading.cp) || shares(tile.hp, reading.hp);
  return shared && agrees(tile.cp, reading.cp) && agrees(tile.hp, reading.hp);
}

/**
 * The tile a reading belongs to, if any. A screenshot without CP or HP (scrolled down)
 * joins the last tile of its family.
 */
export function matchTile(tiles: readonly TileKey[], reading: Reading, familyOf: FamilyOf): string | undefined {
  const family = familyOf(reading);
  const fits = tiles.filter((t) => sameFamily(t.family, family));
  if (reading.cp !== undefined || reading.hp !== undefined) return fits.find((t) => sameNumbers(t, reading))?.id;
  return family === undefined ? undefined : fits.filter((t) => t.family === family).at(-1)?.id;
}

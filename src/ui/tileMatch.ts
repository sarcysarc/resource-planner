// Screenshots added later join the tile they show (ADR 0015), by the same rules that
// group screenshots read together: CP and HP agree, and the Candy families and IVs don't
// clash (ADR 0017).
import type { FamilyOf } from '../core/screen/merge';
import type { Reading } from '../core/screen/types';

/** What a tile was read as, to recognise it in a later screenshot. */
export interface TileKey {
  id: string;
  cp?: number;
  hp?: number;
  family?: string;
  /** As "atk/def/hp". */
  ivs?: string;
}

/** IVs as a tile keeps them. */
export const ivsText = (ivs?: Reading['ivs']) => (ivs ? `${ivs.atk}/${ivs.def}/${ivs.hp}` : undefined);

const agrees = (a?: number, b?: number) => a === undefined || b === undefined || a === b;
const shares = (a?: number, b?: number) => a !== undefined && b !== undefined;
const sameFamily = (a?: string, b?: string) => a === undefined || b === undefined || a === b;

function sameNumbers(tile: TileKey, reading: Reading): boolean {
  const shared = shares(tile.cp, reading.cp) || shares(tile.hp, reading.hp);
  const ivs = !tile.ivs || !reading.ivs || tile.ivs === ivsText(reading.ivs);
  return shared && ivs && agrees(tile.cp, reading.cp) && agrees(tile.hp, reading.hp);
}

/**
 * Every tile a reading could belong to, in order; more than one only for look-alikes read
 * without IVs. A screenshot without CP or HP (scrolled down) fits the last tile of its family.
 */
export function matchTiles(tiles: readonly TileKey[], reading: Reading, familyOf: FamilyOf): string[] {
  const family = familyOf(reading);
  const fits = tiles.filter((t) => sameFamily(t.family, family));
  if (reading.cp !== undefined || reading.hp !== undefined) return fits.filter((t) => sameNumbers(t, reading)).map((t) => t.id);
  return family === undefined ? [] : fits.filter((t) => t.family === family).slice(-1).map((t) => t.id);
}

/** The tile a reading belongs to, if any: the first it fits. */
export const matchTile = (tiles: readonly TileKey[], reading: Reading, familyOf: FamilyOf): string | undefined =>
  matchTiles(tiles, reading, familyOf)[0];

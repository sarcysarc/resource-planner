// Every CP a species can show with what else a screenshot read: used to catch a CP that OCR
// misread (fix C of the 2026-11-04 stress test). HP depends on the level and the HP IV only,
// so those are filtered first and the 256 attack and defence pairs are tried on what is left.
import { MAX_POWER_UP_LEVEL } from '../data/powerUpCosts';
import { fitsLevel } from './infer';
import { halfLevels } from './levels';
import { battleStats, cp } from './stats';
import type { BaseStats, IVs, Modifiers } from './types';

/** What a screenshot showed besides the CP. */
export interface Seen {
  base: BaseStats;
  mods: Modifiers;
  hp?: number;
  dust?: number;
  ivs?: IVs;
}

const ivRange = (iv?: number) => (iv === undefined ? Array.from({ length: 16 }, (_, i) => i) : [iv]);

// The levels and HP IVs that give the HP read, at a level the Stardust cost allows.
function levelsAndHp(seen: Seen): [number, number][] {
  const levels = halfLevels(1, MAX_POWER_UP_LEVEL).filter((level) => fitsLevel(level, seen));
  const fits = (level: number, hp: number) => seen.hp === undefined || battleStats({ base: seen.base, ivs: { atk: 0, def: 0, hp }, level }).hp === seen.hp;
  return levels.flatMap((level) => ivRange(seen.ivs?.hp).filter((hp) => fits(level, hp)).map((hp): [number, number] => [level, hp]));
}

/** The CPs some level and IVs give, keeping to the HP, Stardust cost and IVs read. */
export function reachableCps(seen: Seen): Set<number> {
  const pairs = ivRange(seen.ivs?.atk).flatMap((atk) => ivRange(seen.ivs?.def).map((def) => ({ atk, def })));
  const cps = levelsAndHp(seen).flatMap(([level, hp]) => pairs.map((p) => cp({ base: seen.base, ivs: { ...p, hp }, level })));
  return new Set(cps);
}

import { MAX_POWER_UP_LEVEL } from '../data/powerUpCosts';
import { powerUpCost } from './cost';
import { halfLevels } from './levels';
import { allIVs } from './rank';
import { battleStats, cp } from './stats';
import type { BaseStats, IVs, Modifiers } from './types';

export type Stars = 0 | 1 | 2 | 3 | 4;
export type Bar = 0 | 1 | 2 | 3;

export interface Appraisal {
  stars?: Stars;
  bars?: Partial<Record<keyof IVs, Bar>>;
}

/** What the game shows: CP always; HP, Stardust, level and appraisal when known. */
export interface Observation {
  base: BaseStats;
  cp: number;
  mods: Modifiers;
  hp?: number;
  dust?: number;
  level?: number;
  appraisal?: Appraisal;
}

export interface Match {
  ivs: IVs;
  level: number;
}

const STAR_MINIMUMS = [45, 37, 30, 23];

/** In-game star rating for an IV total: 0–22 → 0, 23–29 → 1, 30–36 → 2, 37–44 → 3, 45 → 4. */
export function starsFor(total: number): Stars {
  const index = STAR_MINIMUMS.findIndex((min) => total >= min);
  return (index === -1 ? 0 : 4 - index) as Stars;
}

/** Appraisal bars have three segments of five IV points; 15 fills all three. */
export function barFor(iv: number): Bar {
  return Math.floor(iv / 5) as Bar;
}

function fitsAppraisal(ivs: IVs, appraisal: Appraisal = {}): boolean {
  if (appraisal.stars !== undefined && starsFor(ivs.atk + ivs.def + ivs.hp) !== appraisal.stars) return false;
  const bars = appraisal.bars ?? {};
  return (['atk', 'def', 'hp'] as const).every((s) => bars[s] === undefined || barFor(ivs[s]) === bars[s]);
}

function fitsLevel(level: number, obs: Observation): boolean {
  if (obs.level !== undefined && level !== obs.level) return false;
  if (obs.dust === undefined) return true;
  if (level >= MAX_POWER_UP_LEVEL) return false;
  return powerUpCost({ from: level, to: level + 0.5, mods: obs.mods }).stardust === obs.dust;
}

function fitsStats(match: Match, obs: Observation): boolean {
  const spread = { base: obs.base, ...match };
  if (cp(spread) !== obs.cp) return false;
  return obs.hp === undefined || battleStats(spread).hp === obs.hp;
}

/** Every IV spread and level consistent with what the game shows, lowest level first. */
export function inferSpreads(obs: Observation): Match[] {
  const levels = halfLevels(1, MAX_POWER_UP_LEVEL).filter((level) => fitsLevel(level, obs));
  const spreads = allIVs().filter((ivs) => fitsAppraisal(ivs, obs.appraisal));
  return levels.flatMap((level) =>
    spreads.map((ivs) => ({ ivs, level })).filter((match) => fitsStats(match, obs)),
  );
}

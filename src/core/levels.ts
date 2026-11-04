import { MAX_LEVEL } from '../data/cpm';
import { MAX_POWER_UP_LEVEL } from '../data/powerUpCosts';
import { battleStats, cp } from './stats';
import type { LeagueInput, SpreadInput } from './types';

export function halfLevels(from: number, to: number): number[] {
  const levels: number[] = [];
  for (let level = from; level <= to; level += 0.5) levels.push(level);
  return levels;
}

// CP rises with level, so binary-search the highest level at or under the cap.
export function maxLevelUnderCap({ base, ivs, cap, maxLevel }: LeagueInput): number | null {
  const levels = halfLevels(1, maxLevel);
  let lo = 0;
  let hi = levels.length - 1;
  let best: number | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cp({ base, ivs, level: levels[mid] }) <= cap) {
      best = levels[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

export interface CpLookup extends SpreadInput {
  cp: number;
  hp?: number;
}

export function levelFromCp({ base, ivs, cp: target, hp }: CpLookup): number | null {
  const matches = halfLevels(1, MAX_LEVEL).filter((level) => cp({ base, ivs, level }) === target);
  if (hp === undefined) return matches[0] ?? null;
  return matches.find((level) => battleStats({ base, ivs, level }).hp === hp) ?? matches[0] ?? null;
}

/** The highest level a trainer can power up to: ten above their own, up to 50. */
/** The highest trainer level. */
export const MAX_TRAINER_LEVEL = 50;

export function powerUpLimit(trainerLevel: number | undefined): number {
  return trainerLevel === undefined ? MAX_POWER_UP_LEVEL : Math.min(trainerLevel + 10, MAX_POWER_UP_LEVEL);
}

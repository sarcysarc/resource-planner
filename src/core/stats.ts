import { cpmAt } from '../data/cpm';
import type { SpreadInput, Stats } from './types';

export interface LevelInput extends SpreadInput {
  level: number;
}

export function battleStats({ base, ivs, level }: LevelInput): Stats {
  const cpm = cpmAt(level);
  return {
    atk: (base.atk + ivs.atk) * cpm,
    def: (base.def + ivs.def) * cpm,
    hp: Math.max(10, Math.floor((base.hp + ivs.hp) * cpm)),
  };
}

export function cp({ base, ivs, level }: LevelInput): number {
  const cpm = cpmAt(level);
  const raw = (base.atk + ivs.atk) * Math.sqrt(base.def + ivs.def) * Math.sqrt(base.hp + ivs.hp);
  return Math.max(10, Math.floor((raw * cpm * cpm) / 10));
}

export function statProduct(stats: Stats): number {
  return stats.atk * stats.def * stats.hp;
}

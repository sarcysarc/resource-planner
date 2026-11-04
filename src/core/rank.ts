import { maxLevelUnderCap } from './levels';
import { battleStats, statProduct } from './stats';
import type { BaseStats, IVs, LeagueInput } from './types';

export interface RankResult {
  rank: number;
  percent: number;
  bestProduct: number;
}

const cache = new Map<string, number[]>();

export function spreadProduct(input: LeagueInput): number {
  const level = maxLevelUnderCap(input);
  return level === null ? 0 : statProduct(battleStats({ ...input, level }));
}

export function allIVs(): IVs[] {
  const spreads: IVs[] = [];
  for (let n = 0; n < 4096; n++) spreads.push({ atk: n >> 8, def: (n >> 4) & 15, hp: n & 15 });
  return spreads;
}

// Stat products of all 4096 spreads, sorted descending, cached per species and league.
function sortedProducts(base: BaseStats, cap: number, maxLevel: number): number[] {
  const key = `${base.atk}/${base.def}/${base.hp}|${cap}|${maxLevel}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const products = allIVs().map((ivs) => spreadProduct({ base, ivs, cap, maxLevel }));
  products.sort((a, b) => b - a);
  cache.set(key, products);
  return products;
}

export function rankSpread(input: LeagueInput): RankResult {
  const products = sortedProducts(input.base, input.cap, input.maxLevel);
  const mine = spreadProduct(input);
  const better = products.findIndex((p) => p <= mine * (1 + 1e-12));
  return { rank: better + 1, percent: (mine / products[0]) * 100, bestProduct: products[0] };
}

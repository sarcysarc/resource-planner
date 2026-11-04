// The purified option derived from a Shadow one (ADR 0006): purifying adds 2 to each IV
// (up to 15), lifts the level to at least 25 and gives the Purified discounts.
import type { PurifyCost } from '../data/purify';
import { purifiedTotal } from './evolveCandy';
import type { Candidate } from './goals';

export const PURIFIED_LEVEL = 25;

const raise = (iv: number) => Math.min(15, iv + 2);

/** The candidate as it would be after purifying, with the purify cost still to pay. */
export function purified(c: Candidate, cost: PurifyCost): Candidate {
  return {
    ...c,
    ivs: { atk: raise(c.ivs.atk), def: raise(c.ivs.def), hp: raise(c.ivs.hp) },
    level: Math.max(c.level, PURIFIED_LEVEL),
    mods: { ...c.mods, variant: 'purified' },
    evolveCandy: purifiedTotal(c.evolveCandy),
    purifyCost: { ...cost, xl: 0 },
  };
}

import { MAX_POWER_UP_LEVEL } from '../data/powerUpCosts';
import { addCosts, powerUpCost, secondMoveCost, ZERO_COST } from './cost';
import { maxLevelUnderCap } from './levels';
import { rankSpread, type RankResult } from './rank';
import { battleStats, cp, statProduct } from './stats';
import type { BaseStats, Cost, IVs, Modifiers } from './types';

export type GoalId = 'great' | 'ultra' | 'master' | 'raid';

export const GOALS: readonly GoalId[] = ['great', 'ultra', 'master', 'raid'];

const CAPS: Record<GoalId, number> = { great: 1500, ultra: 2500, master: Infinity, raid: Infinity };

/** A Pokémon as it will battle: base stats of the target (evolved) species. */
export interface Candidate {
  base: BaseStats;
  ivs: IVs;
  level: number;
  mods: Modifiers;
  bestBuddy: boolean;
  secondMoveUnlocked: boolean;
  secondMoveDust: number;
  evolveCandy: number;
}

export type GoalResult =
  | { eligible: false; reason: 'over-cap' }
  | {
      eligible: true;
      targetLevel: number;
      effectiveLevel: number;
      cp: number;
      value: number;
      rank?: RankResult;
      cost: Cost;
    };

export interface GoalInput {
  candidate: Candidate;
  goal: GoalId;
}

function extrasCost(c: Candidate): Cost {
  const move = c.secondMoveUnlocked ? ZERO_COST : secondMoveCost({ dust: c.secondMoveDust, mods: c.mods });
  return addCosts(move, { stardust: 0, candy: c.evolveCandy, xl: 0 });
}

// Effective (battle) level the candidate should reach, or null if it is already over the cap.
function targetEffectiveLevel(c: Candidate, cap: number): number | null {
  const bonus = c.bestBuddy ? 1 : 0;
  const level = maxLevelUnderCap({ base: c.base, ivs: c.ivs, cap, maxLevel: MAX_POWER_UP_LEVEL + bonus });
  return level === null || level < c.level + bonus ? null : level;
}

function goalValue(c: Candidate, goal: GoalId, level: number): number {
  const stats = battleStats({ base: c.base, ivs: c.ivs, level });
  if (goal !== 'raid') return statProduct(stats);
  return stats.atk * (c.mods.variant === 'shadow' ? 1.2 : 1);
}

export function evaluateGoal({ candidate: c, goal }: GoalInput): GoalResult {
  const cap = CAPS[goal];
  const effectiveLevel = targetEffectiveLevel(c, cap);
  if (effectiveLevel === null) return { eligible: false, reason: 'over-cap' };
  const targetLevel = Math.max(c.level, effectiveLevel - (c.bestBuddy ? 1 : 0));
  const powerUps = powerUpCost({ from: c.level, to: targetLevel, mods: c.mods });
  const spread = { base: c.base, ivs: c.ivs, cap, maxLevel: MAX_POWER_UP_LEVEL + (c.bestBuddy ? 1 : 0) };
  return {
    eligible: true,
    targetLevel,
    effectiveLevel,
    cp: cp({ base: c.base, ivs: c.ivs, level: effectiveLevel }),
    value: goalValue(c, goal, effectiveLevel),
    rank: goal === 'raid' ? undefined : rankSpread(spread),
    cost: addCosts(powerUps, extrasCost(c)),
  };
}

import { MAX_POWER_UP_LEVEL } from '../data/powerUpCosts';
import { addCosts, powerUpCost, secondMoveCost, ZERO_COST } from './cost';
import { SHADOW_ATTACK } from './damage';
import { maxLevelUnderCap } from './levels';
import type { PvpMoves } from './matchups';
import { bestRaidPair, type RaidMoves } from './raid';
import { rankSpread, type RankResult } from './rank';
import { battleStats, cp, statProduct } from './stats';
import type { BaseStats, Cost, IVs, Modifiers, Stats } from './types';

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
  /** Still to pay to purify first (ADR 0006); none when unset. */
  purifyCost?: Cost;
  /** The highest level the trainer can power up to (see powerUpLimit); 50 when unset. */
  maxLevel?: number;
  /** Its types and moves for raid damage per second (ADR 0011); Attack when unset. */
  raidMoves?: RaidMoves;
  /** Its types and PvP fast move per league, for the matchup view only (ADR 0012). */
  pvpMoves?: PvpMoves;
}

/** What a goal's value measures, so the UI can explain it (ADR 0006). */
export type ValueBasis = 'statProduct' | 'attack' | 'shadowAttack' | 'raidDps';

/** The moves a raidDps value used, by name. */
export interface MoveNames {
  fast: string;
  charged: string;
}

/** One part of the remaining cost. Free parts are left out. */
export interface CostPart {
  kind: 'powerUps' | 'secondMove' | 'evolve' | 'purify';
  cost: Cost;
}

export type GoalResult =
  | { eligible: false; reason: 'over-cap' }
  | {
      eligible: true;
      targetLevel: number;
      effectiveLevel: number;
      cp: number;
      value: number;
      basis: ValueBasis;
      moves?: MoveNames;
      rank?: RankResult;
      cost: Cost;
      parts: readonly CostPart[];
    };

export interface GoalInput {
  candidate: Candidate;
  goal: GoalId;
}

const isFree = (cost: Cost) => cost.stardust === 0 && cost.candy === 0 && cost.xl === 0;

function costParts(c: Candidate, powerUps: Cost): CostPart[] {
  const parts: CostPart[] = [
    { kind: 'purify', cost: c.purifyCost ?? ZERO_COST },
    { kind: 'powerUps', cost: powerUps },
    { kind: 'secondMove', cost: c.secondMoveUnlocked ? ZERO_COST : secondMoveCost({ dust: c.secondMoveDust, mods: c.mods }) },
    { kind: 'evolve', cost: { stardust: 0, candy: c.evolveCandy, xl: 0 } },
  ];
  return parts.filter((part) => !isFree(part.cost));
}

// A Pokémon already above the trainer's limit stays where it is.
const levelLimit = (c: Candidate) => Math.max(c.level, c.maxLevel ?? MAX_POWER_UP_LEVEL);

// Effective (battle) level the candidate should reach, or null if it is already over the cap.
function targetEffectiveLevel(c: Candidate, cap: number): number | null {
  const bonus = c.bestBuddy ? 1 : 0;
  const level = maxLevelUnderCap({ base: c.base, ivs: c.ivs, cap, maxLevel: levelLimit(c) + bonus });
  return level === null || level < c.level + bonus ? null : level;
}

interface GoalValue {
  value: number;
  basis: ValueBasis;
  moves?: MoveNames;
}

function raidValue(c: Candidate, stats: Stats): GoalValue {
  const variant = c.mods.variant;
  const pair = c.raidMoves && bestRaidPair({ stats, types: c.raidMoves.types, variant }, c.raidMoves);
  if (pair) return { value: pair.dps, basis: 'raidDps', moves: { fast: pair.fast.name, charged: pair.charged.name } };
  const shadow = variant === 'shadow';
  return { value: stats.atk * (shadow ? SHADOW_ATTACK : 1), basis: shadow ? 'shadowAttack' : 'attack' };
}

function goalValue(c: Candidate, goal: GoalId, level: number): GoalValue {
  const stats = battleStats({ base: c.base, ivs: c.ivs, level });
  return goal === 'raid' ? raidValue(c, stats) : { value: statProduct(stats), basis: 'statProduct' };
}

export function evaluateGoal({ candidate: c, goal }: GoalInput): GoalResult {
  const cap = CAPS[goal];
  const effectiveLevel = targetEffectiveLevel(c, cap);
  if (effectiveLevel === null) return { eligible: false, reason: 'over-cap' };
  const targetLevel = Math.max(c.level, effectiveLevel - (c.bestBuddy ? 1 : 0));
  const powerUps = powerUpCost({ from: c.level, to: targetLevel, mods: c.mods });
  const spread = { base: c.base, ivs: c.ivs, cap, maxLevel: MAX_POWER_UP_LEVEL + (c.bestBuddy ? 1 : 0) };
  const parts = costParts(c, powerUps);
  return {
    eligible: true,
    targetLevel,
    effectiveLevel,
    cp: cp({ base: c.base, ivs: c.ivs, level: effectiveLevel }),
    ...goalValue(c, goal, effectiveLevel),
    rank: goal === 'raid' ? undefined : rankSpread(spread),
    cost: parts.map((part) => part.cost).reduce(addCosts, ZERO_COST),
    parts,
  };
}

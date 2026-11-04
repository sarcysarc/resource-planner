// Raid value from moves (ADR 0011): damage per second of a fast/charged cycle against
// a neutral target. Energy from damage taken, dodges and damage windows are left out.
import { damage, type Combatant } from './damage';
import type { Variant } from './types';

/** About a tier-5 boss's defence; the target has no types, so nothing is super effective. */
export const RAID_DEFENCE = 170;
const TARGET: Combatant = { stats: { atk: 0, def: RAID_DEFENCE, hp: 0 }, types: [], variant: 'normal' };

/** A move's PvE stats (ADR 0007). Energy is gained by a fast move, spent by a charged one. */
export interface PveMove {
  id: string;
  name: string;
  type: string;
  power: number;
  durationMs: number;
  energy: number;
}

/** The moves a candidate can use in raids: its species' types and the moves to try. */
export interface RaidMoves {
  types: readonly string[];
  fast: PveMove[];
  charged: PveMove[];
  /** A charged move it gets for being a Shadow or Purified (Frustration, Return). */
  variantMoves?: Partial<Record<Variant, PveMove>>;
}

export interface MovePair {
  fast: PveMove;
  charged: PveMove;
}

export interface RaidPair extends MovePair {
  dps: number;
}

const hit = (attacker: Combatant, move: PveMove) =>
  damage({ move, attacker, defender: TARGET, mode: 'pve' });

export function cycleDps(attacker: Combatant, { fast, charged }: MovePair): number {
  if (fast.energy <= 0) return 0;
  const n = Math.ceil(charged.energy / fast.energy);
  const total = n * hit(attacker, fast) + hit(attacker, charged);
  return total / ((n * fast.durationMs + charged.durationMs) / 1000);
}

function chargedOptions(moves: RaidMoves, variant: Variant): PveMove[] {
  const extra = moves.variantMoves?.[variant];
  return extra ? [...moves.charged, extra] : moves.charged;
}

/** The fast/charged pair with the highest damage per second, or null if none deals any. */
export function bestRaidPair(attacker: Combatant, moves: RaidMoves): RaidPair | null {
  const pairs = moves.fast.flatMap((fast) => chargedOptions(moves, attacker.variant).map((charged) => ({ fast, charged })));
  const scored = pairs.map((pair) => ({ ...pair, dps: cycleDps(attacker, pair) })).filter((p) => p.dps > 0);
  return scored.reduce<RaidPair | null>((best, p) => (!best || p.dps > best.dps ? p : best), null);
}

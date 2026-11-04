// Damage per hit, PvP and PvE (ADR 0007). Weather, friendship and charged-move
// minigame scores are left out. Multipliers are the game master's own values.
import { effectiveness } from '../data/types';
import type { Stats, Variant } from './types';

export const STAB = 1.2;
export const PVP_BONUS = 1.3;
export const SHADOW_ATTACK = 1.2;
export const SHADOW_DEFENCE = 0.8333333;

export type BattleMode = 'pvp' | 'pve';

/** A Pokémon in battle: battle stats (base + IV) × CPM, its types and variant. */
export interface Combatant {
  stats: Stats;
  types: readonly string[];
  variant: Variant;
}

export interface Hit {
  power: number;
  type: string;
}

export interface DamageInput {
  move: Hit;
  attacker: Combatant;
  defender: Combatant;
  mode: BattleMode;
}

const attackOf = (c: Combatant) => c.stats.atk * (c.variant === 'shadow' ? SHADOW_ATTACK : 1);
const defenceOf = (c: Combatant) => c.stats.def * (c.variant === 'shadow' ? SHADOW_DEFENCE : 1);

export function damage({ move, attacker, defender, mode }: DamageInput): number {
  const stab = attacker.types.includes(move.type) ? STAB : 1;
  const bonus = mode === 'pvp' ? PVP_BONUS : 1;
  const ratio = attackOf(attacker) / defenceOf(defender);
  const multiplier = stab * effectiveness(move.type, defender.types) * bonus;
  return Math.floor(0.5 * move.power * ratio * multiplier) + 1;
}

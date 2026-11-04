// Damage per fast move against meta opponents, PvP (ADR 0012). Shown with league
// results; the verdict does not use it.
import type { LeagueId } from '../data/pvp';
import { type Combatant, damage, type Hit } from './damage';

/** A Pokémon in a PvP matchup, with the fast move it uses. */
export interface Fighter extends Combatant {
  fast: Hit;
}

export interface NamedHit extends Hit {
  name: string;
}

/** A candidate's types and fast move per league, for the matchup view. */
export interface PvpMoves {
  types: readonly string[];
  fast: Record<LeagueId, NamedHit>;
}

/** Damage per fast move: dealt to the opponent, and taken from it. */
export interface Matchup {
  dealt: number;
  taken: number;
}

export function matchup(me: Fighter, them: Fighter): Matchup {
  return {
    dealt: damage({ move: me.fast, attacker: me, defender: them, mode: 'pvp' }),
    taken: damage({ move: them.fast, attacker: them, defender: me, mode: 'pvp' }),
  };
}

/** How many opponents an option does better or worse against than the current one. */
export interface Tally {
  moreDealt: number;
  lessDealt: number;
  lessTaken: number;
  moreTaken: number;
  of: number;
}

export function tally(current: readonly Matchup[], other: readonly Matchup[]): Tally {
  const count = (test: (c: Matchup, o: Matchup) => boolean) => other.filter((o, i) => test(current[i], o)).length;
  return {
    moreDealt: count((c, o) => o.dealt > c.dealt),
    lessDealt: count((c, o) => o.dealt < c.dealt),
    lessTaken: count((c, o) => o.taken < c.taken),
    moreTaken: count((c, o) => o.taken > c.taken),
    of: other.length,
  };
}

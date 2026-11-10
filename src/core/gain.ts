// A line's strongest call (ADR 0017, amended for issue #12): the verdict's pick in a battle
// where it isn't the current one, choosing the battle where that pick gains the most.
import type { Comparison } from './compare';
import type { GoalId } from './goals';

export interface Gain {
  goal: GoalId;
  /** The option, by its place among the options compared; never the current one. */
  option: number;
  /**
   * How much stronger than the current one, as a fraction: under 1% when the pick is as strong
   * for less, and null when the current one can't enter that battle.
   */
  change: number | null;
}

type Row = Pick<Comparison, 'goal' | 'changes' | 'verdict'>;

// On a tie the battle listed first wins.
const PREFER: readonly GoalId[] = ['raid', 'master', 'ultra', 'great'];

function pickIn({ goal, changes, verdict }: Row): Gain | undefined {
  if (verdict.kind === 'neither' || verdict.kind === 'keep') return undefined;
  return { goal, option: verdict.option, change: changes[verdict.option] ?? null };
}

const score = (gain: Gain) => gain.change ?? 0;

/** The pick that gains the most over the current one, or undefined when every verdict keeps it. */
export function bestGain(rows: readonly Row[]): Gain | undefined {
  const sorted = [...rows].sort((a, b) => PREFER.indexOf(a.goal) - PREFER.indexOf(b.goal));
  return sorted.map(pickIn).reduce<Gain | undefined>((best, gain) => (gain && (!best || score(gain) > score(best)) ? gain : best), undefined);
}

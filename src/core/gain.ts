// A line's strongest call (ADR 0017): the option that beats the current one by the most,
// in whichever battle that is, whatever the verdict there.
import type { Comparison } from './compare';
import type { GoalId } from './goals';

export interface Gain {
  goal: GoalId;
  /** The option, by its place among the options compared; never the current one. */
  option: number;
  /** How much stronger than the current one, as a fraction. */
  change: number;
}

// On a tie the battle listed first wins.
const PREFER: readonly GoalId[] = ['raid', 'master', 'ultra', 'great'];

function bestIn({ goal, changes }: Pick<Comparison, 'goal' | 'changes'>): Gain | undefined {
  let best: Gain | undefined;
  changes.forEach((change, option) => {
    if (option > 0 && change !== null && change > (best?.change ?? 0)) best = { goal, option, change };
  });
  return best;
}

/** The biggest gain over the current one, or undefined when nothing beats it. */
export function bestGain(rows: readonly Pick<Comparison, 'goal' | 'changes'>[]): Gain | undefined {
  const sorted = [...rows].sort((a, b) => PREFER.indexOf(a.goal) - PREFER.indexOf(b.goal));
  return sorted.map(bestIn).reduce<Gain | undefined>((best, gain) => (gain && gain.change > (best?.change ?? 0) ? gain : best), undefined);
}

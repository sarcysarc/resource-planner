import type { GoalResult } from './goals';
import type { Cost } from './types';

/**
 * keep: keep investing in the current Pokémon (option 0)
 * switch: invest in the named option instead
 * save: the named option is best but unaffordable now; stop spending and save for it
 * neither: no option can be used for this goal
 * See docs/adr/0003-comparison-verdict-rules.md and 0006-options-model.md.
 */
export type Verdict = { kind: 'neither' } | { kind: 'keep' | 'switch' | 'save'; option: number };

export const VALUE_THRESHOLD = 0.01;

export interface DecisionInput {
  /** One result per option, the current one first. */
  results: GoalResult[];
  resources: Cost;
}

interface Eligible {
  option: number;
  value: number;
  cost: Cost;
}

export function affordable(cost: Cost, resources: Cost): boolean {
  return cost.stardust <= resources.stardust && cost.candy <= resources.candy && cost.xl <= resources.xl;
}

// Fewer XL Candy first (the scarcest resource), then less Stardust.
function isCheaper(a: Cost, b: Cost): boolean {
  return a.xl !== b.xl ? a.xl < b.xl : a.stardust < b.stardust;
}

const eligibleOf = (results: GoalResult[]): Eligible[] =>
  results.flatMap((r, option) => (r.eligible ? [{ option, value: r.value, cost: r.cost }] : []));

// The cheapest of the options within 1% of the best value; ties go to the earlier one.
function winner(options: Eligible[]): Eligible {
  const best = Math.max(...options.map((o) => o.value));
  const contenders = options.filter((o) => o.value * (1 + VALUE_THRESHOLD) >= best);
  return contenders.reduce((win, o) => (isCheaper(o.cost, win.cost) ? o : win));
}

export function decide({ results, resources }: DecisionInput): Verdict {
  const options = eligibleOf(results);
  if (options.length === 0) return { kind: 'neither' };
  const { option, cost } = winner(options);
  if (option === 0) return { kind: 'keep', option };
  return { kind: affordable(cost, resources) ? 'switch' : 'save', option };
}

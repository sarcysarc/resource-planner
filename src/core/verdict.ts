import type { GoalResult } from './goals';
import type { Cost } from './types';

/**
 * keep: keep investing in the current Pokémon
 * switch: invest in the alternative instead
 * save: the alternative is better but unaffordable now; stop spending and save for it
 * neither: neither can be used for this goal
 * See docs/adr/0003-comparison-verdict-rules.md.
 */
export type Verdict = 'keep' | 'switch' | 'save' | 'neither';

export const VALUE_THRESHOLD = 0.01;

export interface DecisionInput {
  current: GoalResult;
  alternative: GoalResult;
  resources: Cost;
}

export function affordable(cost: Cost, resources: Cost): boolean {
  return cost.stardust <= resources.stardust && cost.candy <= resources.candy && cost.xl <= resources.xl;
}

// Fewer XL Candy first (the scarcest resource), then less Stardust.
function isCheaper(a: Cost, b: Cost): boolean {
  return a.xl !== b.xl ? a.xl < b.xl : a.stardust < b.stardust;
}

function switchOrSave(alternative: Cost, resources: Cost): Verdict {
  return affordable(alternative, resources) ? 'switch' : 'save';
}

export function decide({ current, alternative, resources }: DecisionInput): Verdict {
  if (!alternative.eligible) return current.eligible ? 'keep' : 'neither';
  if (!current.eligible) return switchOrSave(alternative.cost, resources);
  const change = (alternative.value - current.value) / current.value;
  if (change > VALUE_THRESHOLD) return switchOrSave(alternative.cost, resources);
  if (change < -VALUE_THRESHOLD) return 'keep';
  return isCheaper(alternative.cost, current.cost) ? switchOrSave(alternative.cost, resources) : 'keep';
}

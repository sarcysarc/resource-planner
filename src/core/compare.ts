import { evaluateGoal, GOALS, type Candidate, type GoalId, type GoalResult } from './goals';
import type { Cost } from './types';
import { decide, type Verdict } from './verdict';

export interface CompareInput {
  /** The options to compare, the current one first (ADR 0006). */
  candidates: Candidate[];
  /** Shared pool: every option is in the same family, so they draw on the same Candy. */
  resources: Cost;
}

export interface Comparison {
  goal: GoalId;
  /** One per option, in the order given. */
  results: GoalResult[];
  verdict: Verdict;
  /** Each option's value relative to the current one (0.02 = 2% better), or null. */
  changes: (number | null)[];
}

function changes(results: GoalResult[]): (number | null)[] {
  const current = results[0];
  return results.map((r) => (current.eligible && r.eligible ? (r.value - current.value) / current.value : null));
}

export function compare({ candidates, resources }: CompareInput): Comparison[] {
  return GOALS.map((goal) => {
    const results = candidates.map((candidate) => evaluateGoal({ candidate, goal }));
    return { goal, results, verdict: decide({ results, resources }), changes: changes(results) };
  });
}

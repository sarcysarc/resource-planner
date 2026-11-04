import { evaluateGoal, GOALS, type Candidate, type GoalId, type GoalResult } from './goals';
import type { Cost } from './types';
import { decide, type Verdict } from './verdict';

export interface CompareInput {
  current: Candidate;
  alternative: Candidate;
  /** Shared pool: both candidates are in the same family, so they draw on the same Candy. */
  resources: Cost;
}

export interface Comparison {
  goal: GoalId;
  current: GoalResult;
  alternative: GoalResult;
  verdict: Verdict;
  /** Alternative's value relative to the current one (0.02 = 2% better), or null. */
  valueChange: number | null;
}

function valueChange(current: GoalResult, alternative: GoalResult): number | null {
  if (!current.eligible || !alternative.eligible) return null;
  return (alternative.value - current.value) / current.value;
}

export function compare({ current, alternative, resources }: CompareInput): Comparison[] {
  return GOALS.map((goal) => {
    const a = evaluateGoal({ candidate: current, goal });
    const b = evaluateGoal({ candidate: alternative, goal });
    return {
      goal,
      current: a,
      alternative: b,
      verdict: decide({ current: a, alternative: b, resources }),
      valueChange: valueChange(a, b),
    };
  });
}

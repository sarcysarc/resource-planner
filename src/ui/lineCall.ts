// Each line's call in step 2's list (ADR 0017): the biggest gain over the current one, or a
// short reason it can't be compared yet. Worked out after each batch and on Compare.
import type { Comparison } from '../core/compare';
import { bestGain } from '../core/gain';
import { GOAL_LABELS, type OptionLabel } from './format';
import type { Lines } from './lines';
import type { LineCall } from './savedBook';

export const MORE = 'Add another Pokémon to compare with: add a screenshot of it, or add it by hand.';

const BEST: LineCall = { text: 'the current one is best', gain: 0 };
const hasIvs = (root: HTMLElement) => ['atk', 'def', 'hp'].every((n) => root.querySelector<HTMLInputElement>(`[name="${n}"]`)?.value);

/** The option that beats the current one by the most, by how much, and in which battle. */
export function callOf(labels: readonly OptionLabel[], rows: readonly Pick<Comparison, 'goal' | 'changes'>[]): LineCall {
  const gain = bestGain(rows);
  if (!gain) return BEST;
  const percent = Math.max(1, Math.round(gain.change * 100));
  return { text: `${labels[gain.option].heading}: ${percent}% stronger in ${GOAL_LABELS[gain.goal].title}`, gain: gain.change };
}

/** Why a line with these Pokémon could not be compared, from the error comparing gave. */
export function reasonOf(error: string, roots: readonly HTMLElement[]): string {
  if (error === MORE) return 'add another to compare';
  if (!roots.every(hasIvs)) return 'needs IVs';
  return error.includes('Candy to evolve') ? 'needs Candy to evolve' : 'needs details';
}

/** Opens each line in turn, out of sight, to work out its call; the open one stays open. */
export function judgeLines(lines: Lines, judge: () => LineCall): void {
  const open = lines.family();
  for (const { family } of lines.list()) {
    lines.open(family);
    lines.setCall(family, judge());
  }
  lines.open(open);
}

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

// "Meowth, CP 437, IVs 14/10/14: No level gives…" reads "check Meowth, …: no level gives…" (issue #10).
function check(error: string, title: string): string {
  const problem = error.slice(title.length + 2);
  return `check ${title}: ${problem.charAt(0).toLowerCase()}${problem.slice(1)}`;
}

/**
 * Why a line with these Pokémon could not be compared, from the error comparing gave;
 * `title` is the Pokémon the error is about, when it is about one.
 */
export function reasonOf(error: string, roots: readonly HTMLElement[], title?: string): string {
  if (error === MORE) return 'add another to compare';
  if (!roots.every(hasIvs)) return 'needs IVs';
  if (error.includes('Candy to evolve')) return 'needs Candy to evolve';
  return title && error.startsWith(`${title}: `) ? check(error, title) : 'needs details';
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

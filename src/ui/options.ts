// The options to compare (ADR 0006): each candidate, followed by its purified self when it
// is Shadow and its purify cost is known.
import type { Candidate } from '../core/goals';
import { purified } from '../core/purify';
import type { PurifyCost } from '../data/purify';
import type { OptionLabel } from './format';

/** One candidate as read from the form, with the cost to purify its current form. */
export interface OptionSide {
  candidate: Candidate;
  purify: PurifyCost | null;
  /** The current form's name, for a note when its purify cost is not known. */
  formName: string;
}

export interface Options {
  candidates: Candidate[];
  labels: OptionLabel[];
  notes: string[];
}

interface SideLabels {
  plain: OptionLabel;
  purified: OptionLabel;
}

const SIDE_LABELS: readonly SideLabels[] = [
  {
    plain: { heading: 'Current', name: 'the current one' },
    purified: { heading: 'Current, purified', name: 'the purified current one', action: 'purify the current one' },
  },
  {
    plain: { heading: 'Alternative', name: 'the alternative' },
    purified: { heading: 'Alternative, purified', name: 'the purified alternative', action: 'switch to the alternative and purify it' },
  },
];

function addSide(options: Options, side: OptionSide, labels: SideLabels): void {
  options.candidates.push(side.candidate);
  options.labels.push(labels.plain);
  if (side.candidate.mods.variant !== 'shadow') return;
  if (!side.purify) {
    options.notes.push(`The purify cost for ${side.formName} is not known, so purifying it is left out.`);
    return;
  }
  options.candidates.push(purified(side.candidate, side.purify));
  options.labels.push(labels.purified);
}

/** The current side first, then the alternative. */
export function buildOptions(sides: readonly [OptionSide, OptionSide]): Options {
  const options: Options = { candidates: [], labels: [], notes: [] };
  sides.forEach((side, i) => addSide(options, side, SIDE_LABELS[i]));
  return options;
}

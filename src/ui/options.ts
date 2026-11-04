// The options to compare (ADR 0006, 0015): each Pokémon, followed by its purified self
// when it is Shadow and its purify cost is known. The current Pokémon comes first.
import type { Candidate } from '../core/goals';
import { purified } from '../core/purify';
import type { PurifyCost } from '../data/purify';
import type { OptionLabel } from './format';

/** One Pokémon as read from its tile, with the cost to purify its current form. */
export interface OptionSide {
  candidate: Candidate;
  purify: PurifyCost | null;
  /** The current form's name, for a note when its purify cost is not known. */
  formName: string;
  /** How its tile names it: name, CP and IVs. */
  title: string;
}

export interface Options {
  candidates: Candidate[];
  labels: OptionLabel[];
  notes: string[];
  /** For each option, the index of the Pokémon it belongs to. */
  owners: number[];
}

interface SideLabels {
  plain: OptionLabel;
  purified: OptionLabel;
}

function sideLabels(title: string, current: boolean): SideLabels {
  if (current) {
    return {
      plain: { heading: `Current: ${title}`, name: 'the current one' },
      purified: { heading: 'Current, purified', name: 'the purified current one', action: 'purify the current one' },
    };
  }
  return {
    plain: { heading: title, name: title },
    purified: { heading: `${title}, purified`, name: `the purified ${title}`, action: `switch to ${title} and purify it` },
  };
}

function add(options: Options, [candidate, label]: [Candidate, OptionLabel], owner: number): void {
  options.candidates.push(candidate);
  options.labels.push(label);
  options.owners.push(owner);
}

function addSide(options: Options, side: OptionSide, owner: number): void {
  const labels = sideLabels(side.title, owner === 0);
  add(options, [side.candidate, labels.plain], owner);
  if (side.candidate.mods.variant !== 'shadow') return;
  if (!side.purify) {
    options.notes.push(`The purify cost for ${side.formName} is not known, so purifying it is left out.`);
    return;
  }
  add(options, [purified(side.candidate, side.purify), labels.purified], owner);
}

/** The current Pokémon first, then the others. */
export function buildOptions(sides: readonly OptionSide[]): Options {
  const options: Options = { candidates: [], labels: [], notes: [], owners: [] };
  sides.forEach((side, i) => addSide(options, side, i));
  return options;
}

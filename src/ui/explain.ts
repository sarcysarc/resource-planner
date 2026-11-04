import type { Comparison } from '../core/compare';
import type { GoalResult } from '../core/goals';
import type { Cost } from '../core/types';
import type { Rare } from './account';
import { capitalise, formatCost, type OptionLabel, shortBy } from './format';

/** What the player has to spend. Blank resources are Infinity. */
export interface Budget {
  resources: Cost;
  rare?: Rare;
}

export interface Explained {
  row: Comparison;
  options: OptionLabel[];
  budget: Budget;
}

type Eligible = Extract<GoalResult, { eligible: true }>;

const OVER = 'already over this league’s CP limit';

/** A value change in words, e.g. 0.05 → "stronger than". */
export function strength(change: number): string {
  const size = Math.abs(change);
  if (size < 0.01) return 'about as strong as';
  const way = change > 0 ? 'stronger than' : 'weaker than';
  if (size < 0.03) return `a little ${way}`;
  return size < 0.1 ? way : `much ${way}`;
}

// The strongest other option, by its value change against the current one.
function bestOther(row: Comparison): number | undefined {
  const others = row.changes.map((c, i) => ({ c, i })).filter(({ c, i }) => i > 0 && c !== null);
  return others.sort((a, b) => b.c! - a.c!)[0]?.i;
}

function keepReason({ row, options }: Explained): string {
  const other = bestOther(row);
  if (other === undefined) return `${options.length > 2 ? 'The others are' : capitalise(options[1].name) + ' is'} ${OVER}.`;
  const said = strength(-row.changes[other]!);
  if (said.startsWith('about')) return 'They end up about as strong, and the current one costs less.';
  return `The current one ends up ${said} ${options[other].name}.`;
}

function changeReason({ row, options }: Explained, option: number): string {
  const change = row.changes[option];
  if (change === null) return `The current one is ${OVER}.`;
  const said = strength(change);
  const { name } = options[option];
  if (said.startsWith('about')) return `They end up about as strong, and ${name} costs less.`;
  return `${capitalise(name)} ends up ${said} the current one.`;
}

const isZero = (cost: Cost) => cost.stardust + cost.candy + cost.xl === 0;
const entered = (resources: Cost) => Object.values(resources).some(Number.isFinite);

function costSentence(result: Eligible, kind: 'keep' | 'switch' | 'save', budget: Budget): string {
  if (isZero(result.cost)) return 'It needs nothing more.';
  const cost = `It costs ${formatCost(result.cost)}`;
  const short = shortBy(result.cost, budget.resources, budget.rare);
  if (kind === 'save') return `${cost}. You are short ${short}, so stop powering up the current one and save up for it.`;
  if (short) return `${cost}. You are short ${short}.`;
  return kind === 'switch' && entered(budget.resources) ? `${cost}, and you have enough.` : `${cost}.`;
}

/** Why the verdict was given, in a sentence or two anyone can follow. */
export function explainVerdict(input: Explained): string {
  const { row, options, budget } = input;
  const { verdict } = row;
  if (verdict.kind === 'neither') {
    const two = options.length === 2;
    return `${two ? 'Both are' : 'All are'} ${OVER}, so ${two ? 'neither' : 'none'} can enter.`;
  }
  const option = verdict.kind === 'keep' ? 0 : verdict.option;
  const reason = verdict.kind === 'keep' ? keepReason(input) : changeReason(input, option);
  return `${reason} ${costSentence(row.results[option] as Eligible, verdict.kind, budget)}`;
}

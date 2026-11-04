import type { Comparison } from '../core/compare';
import type { GoalId, GoalResult } from '../core/goals';
import { type Budget, explainVerdict } from './explain';
import { formatChange, formatCost, formatParts, formatShortfall, formatSummary, formatVerdict, GOAL_LABELS, type OptionLabel } from './format';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

/** One option's result for one goal, and its value change against the current one. */
interface OptionResult {
  label: OptionLabel;
  result: GoalResult;
  change: string;
  /** Shown last, e.g. its matchups (ADR 0012). */
  extra?: HTMLElement | null;
}

const costLine = (cost: string) => (/^\d/.test(cost) ? `Costs ${cost}` : cost);

function lines(result: GoalResult, change: string, budget: Budget): HTMLElement[] {
  if (!result.eligible) return [el('p', 'Already over the CP limit', 'muted')];
  return [
    el('p', formatSummary(result)),
    el('p', change, 'muted'),
    el('p', costLine(formatCost(result.cost)), 'cost'),
    el('p', formatParts(result.parts), 'muted'),
    el('p', formatShortfall(result.cost, budget.resources, budget.rare), 'muted'),
  ].filter((line) => line.textContent);
}

function optionBlock({ label, result, change, extra }: OptionResult, budget: Budget): HTMLElement {
  const block = el('div', '', 'option');
  block.append(el('h4', label.heading), ...lines(result, change, budget), ...(extra ? [extra] : []));
  return block;
}

/** Per goal, one extra element per option (null for none). */
export type Extras = Partial<Record<GoalId, (HTMLElement | null)[]>>;

interface CardInput {
  row: Comparison;
  options: OptionLabel[];
  budget: Budget;
  extras: Extras;
}

// The numbers behind the answer, closed so they don't get in the way.
function numbers({ row, options, budget, extras }: CardInput): HTMLDetailsElement {
  const why = el('details', '', 'why');
  why.append(el('summary', 'See the numbers'));
  row.results.forEach((result, i) => {
    const change = i === 0 ? '' : formatChange(row.changes[i]);
    why.append(optionBlock({ label: options[i], result, change, extra: extras[row.goal]?.[i] }, budget));
  });
  return why;
}

function goalCard(input: CardInput): HTMLElement {
  const { row, options } = input;
  const card = el('section', '', `goal verdict-${row.verdict.kind}`);
  const { title, about } = GOAL_LABELS[row.goal];
  card.append(
    el('h3', title),
    el('p', about, 'muted about'),
    el('p', formatVerdict(row.verdict, options), 'answer'),
    el('p', explainVerdict(input), 'reason'),
    numbers(input),
  );
  return card;
}

export interface RenderInput extends Budget {
  container: HTMLElement;
  /** One per option, in the order of each row's results. */
  options: OptionLabel[];
  rows: Comparison[];
  /** Shown above the cards, e.g. why an option is left out. */
  notes?: string[];
  extras?: Extras;
}

export function renderComparisons({ container, options, rows, resources, rare, notes = [], extras = {} }: RenderInput): void {
  const budget = { resources, rare };
  const cards = rows.map((row) => goalCard({ row, options, budget, extras }));
  container.replaceChildren(...notes.map((note) => el('p', note, 'muted')), ...cards);
}

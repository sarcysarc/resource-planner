import type { Comparison } from '../core/compare';
import type { GoalId, GoalResult } from '../core/goals';
import type { Cost } from '../core/types';
import type { Rare } from './account';
import { formatChange, formatCost, formatParts, formatShortfall, formatSummary, formatVerdict, GOAL_LABELS, type OptionLabel } from './format';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function cell(label: string, ...children: Node[]): HTMLTableCellElement {
  const td = el('td');
  td.dataset.label = label;
  td.append(...children.filter((child) => child.textContent));
  return td;
}

/** What the player has to spend. */
interface Budget {
  resources: Cost;
  rare?: Rare;
}

/** One option's result for one goal, and its value change against the current one. */
interface OptionResult {
  result: GoalResult;
  change: string;
  /** Shown last, e.g. its matchups (ADR 0012). */
  extra?: HTMLElement | null;
}

function resultCell(label: string, { result, change, extra }: OptionResult, budget: Budget): HTMLTableCellElement {
  if (!result.eligible) return cell(label, el('span', 'Over the CP cap', 'muted'));
  return cell(
    label,
    el('div', formatSummary(result)),
    el('div', change, 'muted'),
    el('div', formatCost(result.cost), 'cost'),
    el('div', formatParts(result.parts), 'muted'),
    el('div', formatShortfall(result.cost, budget.resources, budget.rare), 'muted'),
    ...(extra ? [extra] : []),
  );
}

/** Per goal, one extra element per option (null for none). */
export type Extras = Partial<Record<GoalId, (HTMLElement | null)[]>>;

interface RowInput {
  row: Comparison;
  options: OptionLabel[];
  budget: Budget;
  extras: Extras;
}

function goalRow({ row, options, budget, extras }: RowInput): HTMLTableRowElement {
  const tr = el('tr');
  const results = row.results.map((result, i) => {
    const change = i === 0 ? '' : formatChange(row.changes[i]);
    return resultCell(options[i].heading, { result, change, extra: extras[row.goal]?.[i] }, budget);
  });
  const verdict = el('strong', formatVerdict(row.verdict, options), `verdict verdict-${row.verdict.kind}`);
  tr.append(el('th', GOAL_LABELS[row.goal]), ...results, cell('Recommendation', verdict));
  return tr;
}

export interface RenderInput extends Budget {
  container: HTMLElement;
  /** One per option, in the order of each row's results. */
  options: OptionLabel[];
  rows: Comparison[];
  /** Shown above the table, e.g. why an option is left out. */
  notes?: string[];
  extras?: Extras;
}

export function renderComparisons({ container, options, rows, resources, rare, notes = [], extras = {} }: RenderInput): void {
  const table = el('table', '', 'results');
  const head = el('tr');
  ['Goal', ...options.map((o) => o.heading), 'Recommendation'].forEach((h) => head.append(el('th', h)));
  table.createTHead().append(head);
  const body = table.createTBody();
  rows.forEach((row) => body.append(goalRow({ row, options, budget: { resources, rare }, extras })));
  container.replaceChildren(...notes.map((note) => el('p', note, 'muted')), table);
}

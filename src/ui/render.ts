import type { Comparison } from '../core/compare';
import type { GoalResult } from '../core/goals';
import type { Cost } from '../core/types';
import { formatChange, formatCost, formatShortfall, formatSummary, GOAL_LABELS, VERDICT_LABELS } from './format';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function cell(label: string, ...children: Node[]): HTMLTableCellElement {
  const td = el('td');
  td.dataset.label = label;
  td.append(...children);
  return td;
}

function resultCell(label: string, result: GoalResult, resources: Cost): HTMLTableCellElement {
  if (!result.eligible) return cell(label, el('span', 'Over the CP cap', 'muted'));
  return cell(
    label,
    el('div', formatSummary(result)),
    el('div', formatCost(result.cost), 'cost'),
    el('div', formatShortfall(result.cost, resources), 'muted'),
  );
}

function verdictCell(row: Comparison): HTMLTableCellElement {
  const change = formatChange(row.valueChange);
  const children: Node[] = [el('strong', VERDICT_LABELS[row.verdict], `verdict verdict-${row.verdict}`)];
  if (change) children.push(el('div', change, 'muted'));
  return cell('Recommendation', ...children);
}

function goalRow(row: Comparison, resources: Cost): HTMLTableRowElement {
  const tr = el('tr');
  tr.append(
    el('th', GOAL_LABELS[row.goal]),
    resultCell('Current', row.current, resources),
    resultCell('Alternative', row.alternative, resources),
    verdictCell(row),
  );
  return tr;
}

export interface RenderInput {
  container: HTMLElement;
  rows: Comparison[];
  resources: Cost;
}

export function renderComparisons({ container, rows, resources }: RenderInput): void {
  const table = el('table', '', 'results');
  const head = el('tr');
  ['Goal', 'Current', 'Alternative', 'Recommendation'].forEach((h) => head.append(el('th', h)));
  table.createTHead().append(head);
  const body = table.createTBody();
  rows.forEach((row) => body.append(goalRow(row, resources)));
  container.replaceChildren(table);
}

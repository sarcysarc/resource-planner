// Every Pokémon compared for one kind of battle, best first (ADR 0015): the pick, then
// the runners-up with how they compare and what they cost; the rest folded away.
import type { Comparison } from '../core/compare';
import { costLine, formatChange, formatCost, type OptionLabel } from './format';
import { rankOptions } from './ranking';

/** How many are shown before "Show N more". */
const SHOWN = 4;

function item(row: Comparison, option: number, label: OptionLabel): HTMLLIElement {
  const li = document.createElement('li');
  const name = document.createElement('strong');
  name.textContent = label.heading;
  const result = row.results[option];
  const facts = result.eligible ? [formatChange(row.changes[option]), costLine(formatCost(result.cost))] : ['Already over the CP limit'];
  const line = document.createElement('span');
  line.className = 'muted';
  line.textContent = facts.filter(Boolean).join(' · ');
  li.append(name, ' ', line);
  return li;
}

/** Some of the options in rank order, numbered from `start`. */
interface Slice {
  options: number[];
  start: number;
}

function list(row: Comparison, labels: readonly OptionLabel[], { options, start }: Slice): HTMLOListElement {
  const ol = document.createElement('ol');
  ol.start = start;
  ol.append(...options.map((option) => item(row, option, labels[option])));
  return ol;
}

/** The options for this row, best first, with those past the fourth behind a toggle. */
export function rankedList(row: Comparison, labels: readonly OptionLabel[]): HTMLElement {
  const ranked = rankOptions(row);
  const wrap = document.createElement('div');
  wrap.className = 'ranked';
  wrap.append(list(row, labels, { options: ranked.slice(0, SHOWN), start: 1 }));
  const rest = ranked.slice(SHOWN);
  if (!rest.length) return wrap;
  const more = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = `Show ${rest.length} more`;
  more.append(summary, list(row, labels, { options: rest, start: SHOWN + 1 }));
  wrap.append(more);
  return wrap;
}

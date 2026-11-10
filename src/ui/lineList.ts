// Step 2's list of lines (ADR 0017): one button per evolution line with Pokémon in it, with
// its call, the biggest gain first and then by Pokédex number; tapping one opens its grid.
// Shown once there are two lines or more.
import type { Lines, LineSummary } from './lines';
import type { SpeciesIndex } from './species';

export interface LineList {
  nav: HTMLElement;
  /** The tiles; the list is redrawn when they change. */
  grid: HTMLElement;
  lines: Lines;
  index: SpeciesIndex;
  /** After the player opened a line. */
  onOpen?: () => void;
  /** Clears the open line; shown, like the list, once there are two lines or more. */
  clear?: HTMLElement;
  /** Says the rows are for switching lines (issue #9). */
  hint?: HTMLElement;
  /** The grid's heading, which names the open line. */
  heading?: HTMLElement;
  /** Opens the line after the open one, from below the results. */
  next?: HTMLElement;
}

const BY_HAND = 'Typed in by hand';
// A family's first species in the data is the start of its line.
const firstOf = (l: LineList, family: string) => l.index.all.find((s) => s.family === family);
const dexOf = (l: LineList, family: string) => firstOf(l, family)?.dex ?? Infinity;

function nameOf(l: LineList, family: string): string {
  const name = firstOf(l, family)?.name;
  return name ? `${name} line` : BY_HAND;
}

function rowOf(l: LineList, line: LineSummary): HTMLButtonElement {
  const button = Object.assign(l.nav.ownerDocument.createElement('button'), { type: 'button' });
  const call = line.call ? ` · ${line.call.text}` : '';
  button.textContent = `${nameOf(l, line.family)} · ${line.count}${call}`;
  button.dataset.family = line.family;
  if (line.open) button.setAttribute('aria-current', 'true');
  return button;
}

// Lines that can't be compared yet come after those that can.
const gainOf = (line: LineSummary) => line.call?.gain ?? -1;

// The heading names the open line, and Next the one after it in the list, round to the top (issue #9).
function showOpen(l: LineList, lines: readonly LineSummary[]): void {
  const at = lines.findIndex((line) => line.open);
  const many = lines.length > 1 && at >= 0;
  if (l.heading) l.heading.textContent = many ? `Your Pokémon: ${nameOf(l, lines[at].family)}` : 'Your Pokémon';
  if (!l.next) return;
  const after = lines[(at + 1) % lines.length]?.family ?? '';
  l.next.textContent = many ? `Next: ${nameOf(l, after)} →` : '';
  l.next.dataset.family = after;
}

export function renderLines(l: LineList): void {
  const lines = l.lines.list().sort((a, b) => gainOf(b) - gainOf(a) || dexOf(l, a.family) - dexOf(l, b.family));
  l.nav.replaceChildren(...lines.map((line) => rowOf(l, line)));
  l.nav.hidden = lines.length < 2;
  for (const part of [l.clear, l.hint, l.next]) if (part) part.hidden = l.nav.hidden;
  showOpen(l, lines);
}

function openLine(l: LineList, family: string | undefined): boolean {
  if (family === undefined) return false;
  l.lines.open(family);
  renderLines(l);
  l.onOpen?.();
  return true;
}

const familyOf = (event: Event) => (event.target as Element).closest<HTMLElement>('[data-family]')?.dataset.family;

/** Wires the list; gives a function that redraws it. */
export function wireLineList(l: LineList): () => void {
  l.nav.addEventListener('click', (event) => openLine(l, familyOf(event)));
  // Next is below the results, so the newly open line's Pokémon are brought into view.
  l.next?.addEventListener('click', (event) => {
    if (openLine(l, familyOf(event))) l.grid.closest('.card')?.scrollIntoView({ block: 'start' });
  });
  new MutationObserver(() => renderLines(l)).observe(l.grid, { childList: true });
  renderLines(l);
  return () => renderLines(l);
}

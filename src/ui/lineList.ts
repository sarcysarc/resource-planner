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
}

const BY_HAND = 'Typed in by hand';
// A family's first species in the data is the start of its line.
const firstOf = (l: LineList, family: string) => l.index.all.find((s) => s.family === family);
const dexOf = (l: LineList, family: string) => firstOf(l, family)?.dex ?? Infinity;

function rowOf(l: LineList, line: LineSummary): HTMLButtonElement {
  const button = Object.assign(l.nav.ownerDocument.createElement('button'), { type: 'button' });
  const name = firstOf(l, line.family)?.name;
  const call = line.call ? ` · ${line.call.text}` : '';
  button.textContent = `${name ? `${name} line` : BY_HAND} · ${line.count}${call}`;
  button.dataset.family = line.family;
  if (line.open) button.setAttribute('aria-current', 'true');
  return button;
}

// Lines that can't be compared yet come after those that can.
const gainOf = (line: LineSummary) => line.call?.gain ?? -1;

export function renderLines(l: LineList): void {
  const lines = l.lines.list().sort((a, b) => gainOf(b) - gainOf(a) || dexOf(l, a.family) - dexOf(l, b.family));
  l.nav.replaceChildren(...lines.map((line) => rowOf(l, line)));
  l.nav.hidden = lines.length < 2;
  if (l.clear) l.clear.hidden = l.nav.hidden;
}

/** Wires the list; gives a function that redraws it. */
export function wireLineList(l: LineList): () => void {
  l.nav.addEventListener('click', (event) => {
    const family = (event.target as Element).closest<HTMLElement>('[data-family]')?.dataset.family;
    if (family === undefined) return;
    l.lines.open(family);
    renderLines(l);
    l.onOpen?.();
  });
  new MutationObserver(() => renderLines(l)).observe(l.grid, { childList: true });
  renderLines(l);
  return () => renderLines(l);
}

// Each line has its own Clear (ADR 0017): it forgets the open line's Pokémon, here and on
// this device, so its screenshots can be read again, and opens the top of step 2's list.
import type { Lines } from './lines';
import type { SpeciesIndex } from './species';

export interface LineClear {
  button: HTMLElement;
  /** Step 2's list, drawn in its order. */
  nav: HTMLElement;
  lines: Lines;
  index: SpeciesIndex;
  /** Redraws the list, then saves. */
  after: () => void;
}

function ask(c: LineClear): string {
  const family = c.lines.family();
  const name = c.index.all.find((s) => s.family === family)?.name;
  const count = c.lines.list().find((l) => l.open)?.count ?? 0;
  return `Remove the ${name ? `${name} line` : 'typed-in line'}’s ${count} Pokémon from the grid, and from this device?`;
}

/** Wires the open line's Clear. */
export function wireLineClear(c: LineClear): void {
  c.button.addEventListener('click', () => {
    if (!c.button.ownerDocument.defaultView!.confirm(ask(c))) return;
    const next = c.nav.querySelector<HTMLElement>('[data-family]:not([aria-current])')?.dataset.family;
    c.lines.remove(c.lines.family());
    if (next !== undefined) c.lines.open(next);
    c.after();
  });
}

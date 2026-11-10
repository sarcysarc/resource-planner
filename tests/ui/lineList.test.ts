// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderLines } from '../../src/ui/lineList';
import type { Lines, LineSummary } from '../../src/ui/lines';
import { loadBundledIndex } from '../../src/ui/species';

const index = loadBundledIndex();
const line = (family: string, call?: LineSummary['call']): LineSummary => ({ family, target: '', count: 2, open: false, call });

function parts(list: LineSummary[]) {
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K) => document.createElement(tag);
  const lines = { list: () => list } as unknown as Lines;
  const l = { nav: make('nav'), grid: make('div'), lines, index, hint: make('p'), heading: make('h3'), next: make('button') };
  renderLines(l);
  return l;
}

const render = (list: LineSummary[]) => [...parts(list).nav.querySelectorAll('button')].map((b) => b.textContent!);

describe('step 2’s list of lines', () => {
  it('shows each line’s call, the biggest gain first, then the rest by Pokédex number', () => {
    const rows = render([
      line('FAMILY_ARON', { text: 'needs IVs' }),
      line('FAMILY_GASTLY', { text: 'the current one is best', gain: 0 }),
      line('FAMILY_MAGIKARP', { text: 'Gyarados: 20% stronger in Raids & gyms', gain: 0.2 }),
      line('FAMILY_BULBASAUR'),
      line('FAMILY_SNORLAX', { text: 'Snorlax: 5% stronger in Master League', gain: 0.05 }),
    ]);
    expect(rows).toEqual([
      'Magikarp line · 2 · Gyarados: 20% stronger in Raids & gyms',
      'Snorlax line · 2 · Snorlax: 5% stronger in Master League',
      'Gastly line · 2 · the current one is best',
      'Bulbasaur line · 2',
      'Aron line · 2 · needs IVs',
    ]);
  });

  // Issue #9: nothing said which line was open, or how to get to the next.
  it('names the open line in the heading, and the one after it on Next, round to the top', () => {
    const l = parts([line('FAMILY_GASTLY'), { ...line('FAMILY_ARON'), open: true }]);
    expect([l.heading.textContent, l.next.textContent, l.next.hidden, l.hint.hidden]).toEqual(['Your Pokémon: Aron line', 'Next: Gastly line →', false, false]);
  });

  it('keeps the plain heading, and hides the caption and Next, with one line', () => {
    const l = parts([{ ...line('FAMILY_ARON'), open: true }]);
    expect([l.heading.textContent, l.next.hidden, l.hint.hidden]).toEqual(['Your Pokémon', true, true]);
  });
});

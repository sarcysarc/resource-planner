// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { rankedList } from '../../src/ui/ranked';
import type { Comparison } from '../../src/core/compare';

const ok = (value: number, stardust: number) => ({
  eligible: true, targetLevel: 40, effectiveLevel: 40, cp: 2500, value, basis: 'attack',
  cost: { stardust, candy: 0, xl: 0 }, parts: [],
}) as const;
const over = { eligible: false, reason: 'over-cap' } as const;
const labels = ['Current: A', 'B', 'C', 'D', 'E', 'F'].map((heading) => ({ heading, name: heading }));

function row(values: (number | null)[], pick: number): Comparison {
  const results = values.map((v, i) => (v === null ? over : ok(v, 1000 * (i + 1))));
  const changes = values.map((v) => (v === null ? null : (v - 100) / 100));
  return { goal: 'raid', results, verdict: { kind: 'switch', option: pick }, changes };
}
const texts = (root: Element, selector: string) => [...root.querySelectorAll(selector)].map((n) => n.textContent);

describe('rankedList', () => {
  it('lists the pick first, then the rest by strength, with change and cost', () => {
    const list = rankedList(row([100, 120, 110], 1), labels);
    expect(texts(list, 'li > strong')).toEqual(['B', 'C', 'Current: A']);
    expect(list.querySelector('li')!.textContent).toContain('20.0% stronger than the current one');
    expect(list.querySelector('li')!.textContent).toContain('Costs 2,000 Stardust');
  });

  it('puts those over the CP limit last and says so', () => {
    const list = rankedList(row([null, 100, 90], 1), labels);
    expect(texts(list, 'li > strong')).toEqual(['B', 'C', 'Current: A']);
    expect(list.querySelector('li:last-child')!.textContent).toContain('Already over the CP limit');
  });

  it('shows four and folds the rest under "Show N more"', () => {
    const list = rankedList(row([100, 150, 140, 130, 120, 110], 1), labels);
    expect(texts(list, ':scope > ol > li > strong')).toEqual(['B', 'C', 'D', 'E']);
    const more = list.querySelector('details')!;
    expect(more.querySelector('summary')!.textContent).toBe('Show 2 more');
    expect(texts(more, 'li > strong')).toEqual(['F', 'Current: A']);
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderComparisons } from '../../src/ui/render';
import { formatCost, formatShortfall } from '../../src/ui/format';
import type { Comparison } from '../../src/core/compare';

const ok = {
  eligible: true, targetLevel: 43, effectiveLevel: 43, cp: 1499, value: 2e6,
  rank: { rank: 12, percent: 99.4, bestProduct: 2.01e6 }, cost: { stardust: 150000, candy: 120, xl: 40 },
} as const;

const rows: Comparison[] = [
  { goal: 'great', current: { eligible: false, reason: 'over-cap' }, alternative: ok, verdict: 'save', valueChange: null },
  {
    goal: 'raid', current: { ...ok, rank: undefined, value: 150 }, alternative: { ...ok, rank: undefined, value: 160 },
    verdict: 'switch', valueChange: 0.0667,
  },
];

describe('renderComparisons', () => {
  it('renders one row per goal with verdicts and details', () => {
    const container = document.createElement('div');
    renderComparisons({ container, rows, resources: { stardust: 100000, candy: 500, xl: 10 } });
    const text = container.textContent ?? '';
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(text).toContain('Great League');
    expect(text).toContain('Over the CP cap');
    expect(text).toContain('Rank 12');
    expect(text).toContain('Save for the alternative');
    expect(text).toContain('+6.7%');
    expect(text).toContain('Short');
    expect(text).toContain('Attack 150.0');
  });

  it('says what Rare Candy could cover', () => {
    const container = document.createElement('div');
    renderComparisons({ container, rows, resources: { stardust: Infinity, candy: 100, xl: 40 }, rare: { candy: 51, xl: 0 } });
    expect(container.textContent).toContain('Short 20 Candy; you have 51 Rare Candy');
  });
});

describe('formatShortfall', () => {
  const cost = { stardust: 0, candy: 120, xl: 40 };
  const resources = { stardust: Infinity, candy: 100, xl: 10 };

  it('notes the Rare Candy for each kind that is short, without changing the shortfall', () => {
    expect(formatShortfall(cost, resources, { candy: 51, xl: 38 })).toBe('Short 20 Candy · 30 XL; you have 51 Rare Candy and 38 Rare Candy XL');
    expect(formatShortfall(cost, { ...resources, candy: 200 }, { candy: 51, xl: 38 })).toBe('Short 30 XL; you have 38 Rare Candy XL');
  });

  it('leaves the note out when there is no Rare Candy or nothing is short', () => {
    expect(formatShortfall(cost, resources, { candy: 0, xl: 0 })).toBe('Short 20 Candy · 30 XL');
    expect(formatShortfall(cost, resources)).toBe('Short 20 Candy · 30 XL');
    expect(formatShortfall(cost, { stardust: 0, candy: 500, xl: 500 }, { candy: 51, xl: 38 })).toBe('Affordable now');
  });
});

describe('formatCost', () => {
  it('omits zero resources and says when nothing is needed', () => {
    expect(formatCost({ stardust: 0, candy: 0, xl: 0 })).toBe('Nothing more to spend');
    expect(formatCost({ stardust: 12500, candy: 0, xl: 4 })).toBe('12,500 Stardust · 4 XL');
  });
});

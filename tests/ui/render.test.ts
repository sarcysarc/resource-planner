// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderComparisons } from '../../src/ui/render';
import { formatCost, formatParts, formatShortfall } from '../../src/ui/format';
import type { Comparison } from '../../src/core/compare';

const ok = {
  eligible: true, targetLevel: 43, effectiveLevel: 43, cp: 1499, value: 2e6, basis: 'statProduct',
  rank: { rank: 12, percent: 99.4, bestProduct: 2.01e6 }, cost: { stardust: 150000, candy: 120, xl: 40 },
  parts: [{ kind: 'powerUps', cost: { stardust: 150000, candy: 120, xl: 40 } }],
} as const;
const raid = { ...ok, rank: undefined, basis: 'shadowAttack' } as const;

const rows: Comparison[] = [
  { goal: 'great', results: [{ eligible: false, reason: 'over-cap' }, ok], verdict: { kind: 'save', option: 1 }, changes: [null, null] },
  { goal: 'raid', results: [{ ...raid, value: 150 }, { ...raid, value: 160 }], verdict: { kind: 'switch', option: 1 }, changes: [0, 0.0667] },
];
const options = [{ heading: 'Current', name: 'the current one' }, { heading: 'Alternative', name: 'the alternative' }];
const render = (input: Partial<Parameters<typeof renderComparisons>[0]> = {}) => {
  const container = document.createElement('div');
  renderComparisons({ container, options, rows, resources: { stardust: 100000, candy: 500, xl: 10 }, ...input });
  return container;
};

describe('renderComparisons', () => {
  const cards = (container: HTMLElement) => [...container.querySelectorAll('section.goal')];

  it('renders one card per goal that leads with the answer and why', () => {
    const [great, raidCard] = cards(render());
    expect(great.querySelector('h3')!.textContent).toBe('Great League');
    expect(great.textContent).toContain('Trainer battles for Pokémon up to 1,500 CP');
    expect(great.querySelector('.answer')!.textContent).toBe('Save up for the alternative');
    expect(great.querySelector('.reason')!.textContent).toMatch(/^The current one is already over this league’s CP limit\./);
    expect(raidCard.querySelector('.answer')!.textContent).toBe('Switch to the alternative');
    expect(raidCard.className).toContain('verdict-switch');
  });

  it('keeps the numbers behind a closed toggle', () => {
    const container = render();
    const why = container.querySelector<HTMLDetailsElement>('details.why')!;
    expect(why.open).toBe(false);
    expect(why.querySelector('summary')!.textContent).toBe('See the numbers');
    const text = container.textContent ?? '';
    expect(text).toContain('Already over the CP limit');
    expect(text).toContain('its IVs rank 12 of 4,096 for this league');
    expect(text).toContain('6.7% stronger than the current one');
    expect(text).toContain('You are short');
    expect(text).toContain('Attack 150.0 with the Shadow bonus');
  });

  it('adds each option’s matchups under its league numbers', () => {
    const view = document.createElement('details');
    view.textContent = 'With Splash against the 30 most-used opponents';
    const blocks = render({ extras: { great: [null, view] } }).querySelectorAll('section.goal:first-of-type .option');
    expect(blocks[1].querySelector('details')).toBe(view);
    expect(blocks[0].querySelector('details')).toBeNull();
  });

  it('has a block for each option', () => {
    const three = [...options, { heading: 'Purified', name: 'the purified one' }];
    const wide: Comparison[] = [{ ...rows[1], results: [...rows[1].results, ok], verdict: { kind: 'save', option: 2 }, changes: [0, 0.0667, -0.02] }];
    const container = render({ options: three, rows: wide });
    expect([...container.querySelectorAll('.option h4')].map((h) => h.textContent)).toEqual(['Current', 'Alternative', 'Purified']);
    expect(container.textContent).toContain('Save up for the purified one');
    expect(container.textContent).toContain('2.0% weaker than the current one');
  });

  it('says to purify when a purified option wins', () => {
    const purify = [options[0], { heading: 'Current, purified', name: 'the purified current one', action: 'purify the current one' }];
    const two = (kind: 'switch' | 'save'): Comparison[] => [{ ...rows[1], verdict: { kind, option: 1 } }];
    expect(render({ options: purify, rows: two('switch') }).textContent).toContain('Purify the current one');
    expect(render({ options: purify, rows: two('save') }).textContent).toContain('Save up to purify the current one');
  });

  it('shows notes above the cards', () => {
    expect(render({ notes: ['A note.'] }).querySelector('p.muted')!.textContent).toBe('A note.');
  });

  it('says what Rare Candy could cover', () => {
    const container = render({ resources: { stardust: Infinity, candy: 100, xl: 40 }, rare: { candy: 51, xl: 0 } });
    expect(container.textContent).toContain('You are short 20 Candy; you have 51 Rare Candy');
  });
});

describe('formatParts', () => {
  it('lists the parts of a cost when there is more than one', () => {
    const parts = [
      { kind: 'powerUps', cost: { stardust: 100000, candy: 70, xl: 0 } },
      { kind: 'secondMove', cost: { stardust: 50000, candy: 50, xl: 0 } },
      { kind: 'evolve', cost: { stardust: 0, candy: 125, xl: 0 } },
    ] as const;
    const purify = { kind: 'purify', cost: { stardust: 3000, candy: 3, xl: 0 } } as const;
    expect(formatParts([purify, parts[0]])).toBe('Purify 3,000 Stardust · 3 Candy; power-ups 100,000 Stardust · 70 Candy');
    expect(formatParts([...parts])).toBe('Power-ups 100,000 Stardust · 70 Candy; second move 50,000 Stardust · 50 Candy; evolve 125 Candy');
    expect(formatParts([parts[0]])).toBe('');
  });
});

describe('formatShortfall', () => {
  const cost = { stardust: 0, candy: 120, xl: 40 };
  const resources = { stardust: Infinity, candy: 100, xl: 10 };

  it('notes the Rare Candy for each kind that is short, without changing the shortfall', () => {
    expect(formatShortfall(cost, resources, { candy: 51, xl: 38 })).toBe('You are short 20 Candy · 30 XL; you have 51 Rare Candy and 38 Rare Candy XL');
    expect(formatShortfall(cost, { ...resources, candy: 200 }, { candy: 51, xl: 38 })).toBe('You are short 30 XL; you have 38 Rare Candy XL');
  });

  it('leaves the note out when there is no Rare Candy or nothing is short', () => {
    expect(formatShortfall(cost, resources, { candy: 0, xl: 0 })).toBe('You are short 20 Candy · 30 XL');
    expect(formatShortfall(cost, resources)).toBe('You are short 20 Candy · 30 XL');
    expect(formatShortfall(cost, { stardust: 0, candy: 500, xl: 500 }, { candy: 51, xl: 38 })).toBe('You have enough');
  });
});

describe('formatCost', () => {
  it('omits zero resources and says when nothing is needed', () => {
    expect(formatCost({ stardust: 0, candy: 0, xl: 0 })).toBe('Nothing more to spend');
    expect(formatCost({ stardust: 12500, candy: 0, xl: 4 })).toBe('12,500 Stardust · 4 XL');
  });
});

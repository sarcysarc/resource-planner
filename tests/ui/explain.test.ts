import { describe, expect, it } from 'vitest';
import type { Comparison } from '../../src/core/compare';
import type { GoalResult } from '../../src/core/goals';
import { explainVerdict, strength } from '../../src/ui/explain';

const result = (value: number, cost = { stardust: 100000, candy: 80, xl: 0 }): GoalResult => ({
  eligible: true, targetLevel: 40, effectiveLevel: 40, cp: 1490, value, basis: 'statProduct', cost,
  parts: [{ kind: 'powerUps', cost }],
});
const over: GoalResult = { eligible: false, reason: 'over-cap' };
const options = [{ heading: 'Current', name: 'the current one' }, { heading: 'Alternative', name: 'the alternative' }];
const unlimited = { stardust: Infinity, candy: Infinity, xl: Infinity };

function row(results: GoalResult[], verdict: Comparison['verdict']): Comparison {
  const base = results[0].eligible ? results[0].value : 0;
  const changes = results.map((r) => (base && r.eligible ? (r.value - base) / base : null));
  return { goal: 'great', results, verdict, changes };
}

const explain = (r: Comparison, resources = unlimited) => explainVerdict({ row: r, options, budget: { resources } });

describe('strength', () => {
  it('puts a value change in words', () => {
    expect([0.004, -0.009, 0.02, -0.05, 0.25].map(strength)).toEqual([
      'about as strong as', 'about as strong as', 'a little stronger than', 'weaker than', 'much stronger than',
    ]);
  });
});

describe('explainVerdict', () => {
  it('says how much stronger the alternative ends up and that it is affordable', () => {
    const r = row([result(100), result(102)], { kind: 'switch', option: 1 });
    expect(explain(r, { stardust: 500000, candy: 500, xl: 50 })).toBe(
      'The alternative ends up a little stronger than the current one. It costs 100,000 Stardust · 80 Candy, and you have enough.',
    );
  });

  it('leaves out affordability when no resources were entered', () => {
    const r = row([result(100), result(120)], { kind: 'switch', option: 1 });
    expect(explain(r)).toBe('The alternative ends up much stronger than the current one. It costs 100,000 Stardust · 80 Candy.');
  });

  it('says what is short when saving up', () => {
    const r = row([result(100), result(105)], { kind: 'save', option: 1 });
    expect(explain(r, { stardust: 40000, candy: 500, xl: 50 })).toBe(
      'The alternative ends up stronger than the current one. It costs 100,000 Stardust · 80 Candy. ' +
        'You are short 60,000 Stardust, so stop powering up the current one and save up for it.',
    );
  });

  it('explains a tie won on cost', () => {
    const r = row([result(100), result(100.5, { stardust: 1000, candy: 1, xl: 0 })], { kind: 'switch', option: 1 });
    expect(explain(r)).toBe('They end up about as strong, and the alternative costs less. It costs 1,000 Stardust · 1 Candy.');
  });

  it('explains keeping the current one', () => {
    expect(explain(row([result(110), result(100)], { kind: 'keep', option: 0 }))).toBe(
      'The current one ends up stronger than the alternative. It costs 100,000 Stardust · 80 Candy.',
    );
    expect(explain(row([result(100), result(100.5)], { kind: 'keep', option: 0 }))).toMatch(/^They end up about as strong, and the current one costs less\./);
  });

  it('says when one is over the CP limit', () => {
    expect(explain(row([result(100), over], { kind: 'keep', option: 0 }))).toMatch(/^The alternative is already over this league’s CP limit\./);
    expect(explain(row([over, result(100)], { kind: 'switch', option: 1 }))).toMatch(/^The current one is already over this league’s CP limit\./);
  });

  it('says when nothing more is needed', () => {
    const r = row([result(110, { stardust: 0, candy: 0, xl: 0 }), result(100)], { kind: 'keep', option: 0 });
    expect(explain(r)).toBe('The current one ends up stronger than the alternative. It needs nothing more.');
  });

  it('says when neither can enter', () => {
    expect(explain(row([over, over], { kind: 'neither' }))).toBe('Both are already over this league’s CP limit, so neither can enter.');
  });
});

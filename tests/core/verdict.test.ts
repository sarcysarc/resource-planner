import { describe, expect, it } from 'vitest';
import { decide } from '../../src/core/verdict';
import type { GoalResult } from '../../src/core/goals';

const rich = { stardust: 1e9, candy: 1e6, xl: 1e6 };
const broke = { stardust: 0, candy: 0, xl: 0 };
const over: GoalResult = { eligible: false, reason: 'over-cap' };

function result(value: number, xl = 0, stardust = 0): GoalResult {
  const cost = { stardust, candy: 0, xl };
  return { eligible: true, targetLevel: 40, effectiveLevel: 40, cp: 1500, value, basis: 'statProduct', cost, parts: [] };
}

const kind = (results: GoalResult[], resources = rich) => decide({ results, resources }).kind;

describe('decide, two options (ADR 0003)', () => {
  it('handles ineligible options', () => {
    expect(decide({ results: [over, over], resources: rich })).toEqual({ kind: 'neither' });
    expect(kind([result(1), over])).toBe('keep');
    expect(kind([over, result(1)])).toBe('switch');
    expect(kind([over, result(1, 5)], broke)).toBe('save');
  });

  it('switches when the alternative is clearly better and affordable', () => {
    expect(decide({ results: [result(100), result(102)], resources: rich })).toEqual({ kind: 'switch', option: 1 });
  });

  it('saves up when the alternative is clearly better but unaffordable', () => {
    expect(kind([result(100), result(102, 50)], broke)).toBe('save');
  });

  it('keeps the current one when it is clearly better', () => {
    expect(decide({ results: [result(102), result(100)], resources: rich })).toEqual({ kind: 'keep', option: 0 });
  });

  it('picks the cheaper one when values are within 1%', () => {
    expect(kind([result(100, 50), result(100.5, 10)])).toBe('switch');
    expect(kind([result(100, 10, 5000), result(100.5, 10, 1000)])).toBe('switch');
    expect(kind([result(100, 10), result(100.5, 10)])).toBe('keep');
  });
});

describe('decide, more options (ADR 0006)', () => {
  it('names the best option', () => {
    expect(decide({ results: [result(100), result(102), result(105)], resources: rich })).toEqual({ kind: 'switch', option: 2 });
  });

  it('picks the cheapest of the options within 1% of the best', () => {
    const results = [result(100, 0, 9000), result(105, 30), result(104.5, 10), result(104, 10)];
    expect(decide({ results, resources: rich })).toEqual({ kind: 'switch', option: 2 });
  });

  it('gives a tie to the earlier option and skips ineligible ones', () => {
    expect(decide({ results: [over, result(100, 5), result(100, 5)], resources: broke })).toEqual({ kind: 'save', option: 1 });
    expect(kind([result(100, 5), over, result(100, 5)])).toBe('keep');
  });
});

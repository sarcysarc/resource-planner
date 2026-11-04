import { describe, expect, it } from 'vitest';
import { decide } from '../../src/core/verdict';
import type { GoalResult } from '../../src/core/goals';

const rich = { stardust: 1e9, candy: 1e6, xl: 1e6 };
const broke = { stardust: 0, candy: 0, xl: 0 };
const over: GoalResult = { eligible: false, reason: 'over-cap' };

function result(value: number, xl = 0, stardust = 0): GoalResult {
  return { eligible: true, targetLevel: 40, effectiveLevel: 40, cp: 1500, value, cost: { stardust, candy: 0, xl } };
}

describe('decide', () => {
  it('handles ineligible candidates', () => {
    expect(decide({ current: over, alternative: over, resources: rich })).toBe('neither');
    expect(decide({ current: result(1), alternative: over, resources: rich })).toBe('keep');
    expect(decide({ current: over, alternative: result(1), resources: rich })).toBe('switch');
    expect(decide({ current: over, alternative: result(1, 5), resources: broke })).toBe('save');
  });

  it('switches when the alternative is clearly better and affordable', () => {
    expect(decide({ current: result(100), alternative: result(102), resources: rich })).toBe('switch');
  });

  it('saves up when the alternative is clearly better but unaffordable', () => {
    expect(decide({ current: result(100), alternative: result(102, 50), resources: broke })).toBe('save');
  });

  it('keeps the current one when it is clearly better', () => {
    expect(decide({ current: result(102), alternative: result(100), resources: rich })).toBe('keep');
  });

  it('picks the cheaper one when values are within 1%', () => {
    expect(decide({ current: result(100, 50), alternative: result(100.5, 10), resources: rich })).toBe('switch');
    expect(decide({ current: result(100, 10, 5000), alternative: result(100.5, 10, 1000), resources: rich })).toBe('switch');
    expect(decide({ current: result(100, 10), alternative: result(100.5, 10), resources: rich })).toBe('keep');
  });
});

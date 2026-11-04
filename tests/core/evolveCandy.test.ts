import { describe, expect, it } from 'vitest';
import { baseCost, evolveTotal, stepCost } from '../../src/core/evolveCandy';

describe('baseCost', () => {
  it('keeps the cost shown for Normal and Shadow', () => {
    expect(baseCost(25, 'normal')).toBe(25);
    expect(baseCost(100, 'shadow')).toBe(100);
  });

  it('undoes the Purified 10% discount', () => {
    expect(baseCost(45, 'purified')).toBe(50);
    expect(baseCost(90, 'purified')).toBe(100);
    expect([baseCost(22, 'purified'), baseCost(23, 'purified')]).toEqual([25, 25]);
    expect(baseCost(11, 'purified')).toBe(12);
  });

  it('keeps a Purified cost it cannot place', () => {
    expect(baseCost(37, 'purified')).toBe(37);
  });
});

describe('stepCost', () => {
  it('takes 10% off for Purified, rounding up so the plan never falls short', () => {
    expect(stepCost(50, 'purified')).toBe(45);
    expect(stepCost(25, 'purified')).toBe(23);
    expect(stepCost(100, 'normal')).toBe(100);
  });
});

describe('evolveTotal', () => {
  it('adds every step from the current form to the target', () => {
    expect(evolveTotal([25, 100], 'normal')).toBe(125);
    expect(evolveTotal([50, 100], 'purified')).toBe(135);
  });

  it('is zero at the target and unknown while any step is unknown', () => {
    expect(evolveTotal([], 'normal')).toBe(0);
    expect(evolveTotal([25, undefined], 'normal')).toBeUndefined();
  });
});

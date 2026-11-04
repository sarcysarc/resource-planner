import { describe, expect, it } from 'vitest';
import { stepCost } from '../../src/data/powerUpCosts';

describe('stepCost', () => {
  it('uses regular Candy below 40', () => {
    expect(stepCost(1)).toEqual({ stardust: 200, candy: 1, xl: 0 });
    expect(stepCost(25.5)).toEqual({ stardust: 4000, candy: 3, xl: 0 });
    expect(stepCost(26)).toEqual({ stardust: 4000, candy: 4, xl: 0 });
    expect(stepCost(39.5)).toEqual({ stardust: 10000, candy: 15, xl: 0 });
  });

  it('uses XL Candy from 40', () => {
    expect(stepCost(40)).toEqual({ stardust: 10000, candy: 0, xl: 10 });
    expect(stepCost(49.5)).toEqual({ stardust: 15000, candy: 0, xl: 20 });
  });

  it('has no power-up from level 50 or above', () => {
    expect(() => stepCost(50)).toThrow();
    expect(() => stepCost(0.5)).toThrow();
  });
});

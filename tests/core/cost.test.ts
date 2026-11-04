import { describe, expect, it } from 'vitest';
import { addCosts, powerUpCost, secondMoveCost } from '../../src/core/cost';

const normal = { variant: 'normal', lucky: false } as const;

describe('powerUpCost', () => {
  it('matches published totals for 1 to 40 and 40 to 50', () => {
    expect(powerUpCost({ from: 1, to: 40, mods: normal })).toEqual({ stardust: 270000, candy: 304, xl: 0 });
    expect(powerUpCost({ from: 40, to: 50, mods: normal })).toEqual({ stardust: 250000, candy: 0, xl: 296 });
  });

  it('applies Shadow and Purified multipliers rounding up per power-up', () => {
    expect(powerUpCost({ from: 40, to: 50, mods: { variant: 'shadow', lucky: false } }).xl).toBe(360);
    expect(powerUpCost({ from: 40, to: 50, mods: { variant: 'purified', lucky: false } }).xl).toBe(272);
  });

  it('halves Stardust for Lucky Pokémon', () => {
    expect(powerUpCost({ from: 1, to: 40, mods: { variant: 'normal', lucky: true } }).stardust).toBe(135000);
  });

  it('costs nothing when already at the target', () => {
    expect(powerUpCost({ from: 30, to: 30, mods: normal })).toEqual({ stardust: 0, candy: 0, xl: 0 });
    expect(powerUpCost({ from: 31, to: 30, mods: normal })).toEqual({ stardust: 0, candy: 0, xl: 0 });
  });
});

describe('secondMoveCost', () => {
  it('maps Stardust tiers to Candy', () => {
    expect(secondMoveCost({ dust: 10000, mods: normal })).toEqual({ stardust: 10000, candy: 25, xl: 0 });
    expect(secondMoveCost({ dust: 50000, mods: normal })).toEqual({ stardust: 50000, candy: 50, xl: 0 });
    expect(secondMoveCost({ dust: 100000, mods: normal })).toEqual({ stardust: 100000, candy: 100, xl: 0 });
  });

  it('applies the Shadow multiplier', () => {
    expect(secondMoveCost({ dust: 50000, mods: { variant: 'shadow', lucky: false } })).toEqual({ stardust: 60000, candy: 60, xl: 0 });
  });
});

describe('addCosts', () => {
  it('sums each resource', () => {
    expect(addCosts({ stardust: 1, candy: 2, xl: 3 }, { stardust: 4, candy: 5, xl: 6 })).toEqual({ stardust: 5, candy: 7, xl: 9 });
  });
});

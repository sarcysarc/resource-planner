import { describe, expect, it } from 'vitest';
import { purifyCost } from '../../src/data/purify';
import { findSpecies, loadBundledIndex } from '../../src/ui/species';

describe('purifyCost', () => {
  it('maps each second-move tier to its purify cost', () => {
    expect(purifyCost(10000)).toEqual({ stardust: 1000, candy: 1 });
    expect(purifyCost(50000)).toEqual({ stardust: 3000, candy: 3 });
    expect(purifyCost(75000)).toEqual({ stardust: 5000, candy: 5 });
    expect(purifyCost(100000)).toEqual({ stardust: 20000, candy: 20 });
  });

  it('has no answer outside the four tiers', () => {
    expect(purifyCost(null)).toBeNull();
    expect(purifyCost(60000)).toBeNull();
  });

  it('matches the purify screens read in game (ADR 0005)', () => {
    const index = loadBundledIndex();
    const cost = (id: string) => purifyCost(findSpecies(index, id)?.secondMoveDust ?? null);
    expect(cost('magikarp')).toEqual({ stardust: 1000, candy: 1 });
    expect(cost('kingler')).toEqual({ stardust: 3000, candy: 3 });
    expect(cost('snorlax')).toEqual({ stardust: 5000, candy: 5 });
    expect(cost('reshiram')).toEqual({ stardust: 20000, candy: 20 });
  });
});

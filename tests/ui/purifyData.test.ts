import { describe, expect, it } from 'vitest';
import { purifyCostOf } from '../../src/ui/purifyData';

describe('purifyCostOf (bundled data)', () => {
  it('matches the purify screens read in game (ADR 0005)', () => {
    expect(purifyCostOf('magikarp')).toEqual({ stardust: 1000, candy: 1 });
    expect(purifyCostOf('kingler')).toEqual({ stardust: 3000, candy: 3 });
    expect(purifyCostOf('snorlax')).toEqual({ stardust: 5000, candy: 5 });
    expect(purifyCostOf('reshiram')).toEqual({ stardust: 20000, candy: 20 });
  });

  // The second-move tiers priced these wrongly (found 2026-11-08).
  it('prices the species the second-move tiers got wrong', () => {
    expect(purifyCostOf('charmander')).toEqual({ stardust: 3000, candy: 3 });
    expect(purifyCostOf('throh')).toEqual({ stardust: 5000, candy: 1 });
    expect(purifyCostOf('timburr')).toEqual({ stardust: 3000, candy: 3 });
  });

  it('has no answer for a species with no purify price', () => {
    expect(purifyCostOf('mew')).toBeNull();
    expect(purifyCostOf('not-a-species')).toBeNull();
  });
});

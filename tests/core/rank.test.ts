import { describe, expect, it } from 'vitest';
import { rankSpread } from '../../src/core/rank';

const azumarill = { atk: 112, def: 152, hp: 225 };
const mewtwo = { atk: 300, def: 182, hp: 214 };

describe('rankSpread', () => {
  it('ranks a hundo first when there is no cap', () => {
    const r = rankSpread({ base: mewtwo, ivs: { atk: 15, def: 15, hp: 15 }, cap: Infinity, maxLevel: 50 });
    expect(r.rank).toBe(1);
    expect(r.percent).toBeCloseTo(100, 5);
  });

  it('ranks a hundo poorly in Great League for a bulky Pokémon', () => {
    const r = rankSpread({ base: azumarill, ivs: { atk: 15, def: 15, hp: 15 }, cap: 1500, maxLevel: 50 });
    expect(r.rank).toBeGreaterThan(1000);
    expect(r.percent).toBeLessThan(100);
  });

  it('gives exactly one spread rank 1 or ties at 100%', () => {
    const r = rankSpread({ base: azumarill, ivs: { atk: 0, def: 15, hp: 15 }, cap: 1500, maxLevel: 50 });
    expect(r.rank).toBeLessThan(50);
    expect(r.percent).toBeGreaterThan(99);
  });
});

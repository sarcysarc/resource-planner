import { describe, expect, it } from 'vitest';
import { battleStats, cp, statProduct } from '../../src/core/stats';

const mewtwo = { atk: 300, def: 182, hp: 214 };
const hundo = { atk: 15, def: 15, hp: 15 };

describe('cp', () => {
  it('matches known Mewtwo values', () => {
    expect(cp({ base: mewtwo, ivs: hundo, level: 40 })).toBe(4178);
    expect(cp({ base: mewtwo, ivs: hundo, level: 50 })).toBe(4724);
  });

  it('never goes below 10', () => {
    const tiny = { atk: 1, def: 1, hp: 1 };
    expect(cp({ base: tiny, ivs: { atk: 0, def: 0, hp: 0 }, level: 1 })).toBe(10);
  });
});

describe('battleStats', () => {
  it('floors HP but keeps attack and defense fractional', () => {
    const s = battleStats({ base: mewtwo, ivs: hundo, level: 40 });
    expect(s.hp).toBe(Math.floor(229 * 0.7903))
    expect(s.atk).toBeCloseTo(315 * 0.7903, 1);
  });
});

describe('statProduct', () => {
  it('multiplies the three stats', () => {
    expect(statProduct({ atk: 2, def: 3, hp: 4 })).toBe(24);
  });
});

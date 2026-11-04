import { describe, expect, it } from 'vitest';
import { barFor, inferSpreads, starsFor, type Observation } from '../../src/core/infer';
import { battleStats, cp } from '../../src/core/stats';

const azumarill = { atk: 112, def: 152, hp: 225 };
const normal = { variant: 'normal', lucky: false } as const;

function observe(ivs: { atk: number; def: number; hp: number }, level: number): Observation {
  const spread = { base: azumarill, ivs, level };
  return { base: azumarill, cp: cp(spread), hp: battleStats(spread).hp, mods: normal };
}

describe('starsFor', () => {
  it('maps IV totals to the in-game star rating', () => {
    expect([0, 22, 23, 29, 30, 36, 37, 44, 45].map(starsFor)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4]);
  });
});

describe('barFor', () => {
  it('maps an IV to how many bar segments it fills', () => {
    expect([0, 4, 5, 9, 10, 14, 15].map(barFor)).toEqual([0, 0, 1, 1, 2, 2, 3]);
  });
});

describe('inferSpreads', () => {
  it('includes the true spread and level', () => {
    const matches = inferSpreads(observe({ atk: 10, def: 12, hp: 14 }, 27.5));
    expect(matches).toContainEqual({ ivs: { atk: 10, def: 12, hp: 14 }, level: 27.5 });
  });

  it('only returns spreads with the observed CP and HP', () => {
    const obs = observe({ atk: 3, def: 8, hp: 11 }, 20);
    for (const m of inferSpreads(obs)) {
      const spread = { base: azumarill, ivs: m.ivs, level: m.level };
      expect(cp(spread)).toBe(obs.cp);
      expect(battleStats(spread).hp).toBe(obs.hp);
    }
  });

  it('narrows to one spread with a full appraisal', () => {
    const obs: Observation = { ...observe({ atk: 15, def: 15, hp: 15 }, 30), appraisal: { stars: 4 } };
    expect(inferSpreads(obs)).toEqual([{ ivs: { atk: 15, def: 15, hp: 15 }, level: 30 }]);
  });

  it('filters by appraisal bars', () => {
    const obs: Observation = { ...observe({ atk: 2, def: 15, hp: 13 }, 20), appraisal: { bars: { atk: 0, def: 3, hp: 2 } } };
    const matches = inferSpreads(obs);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((m) => m.ivs.atk < 5 && m.ivs.def === 15 && m.ivs.hp >= 10)).toBe(true);
  });

  it('filters by the power-up Stardust shown, including Lucky', () => {
    const obs = { ...observe({ atk: 10, def: 10, hp: 10 }, 30), dust: 2500, mods: { variant: 'normal', lucky: true } } as const;
    const levels = inferSpreads(obs).map((m) => m.level);
    expect(levels).toContain(30);
    expect(levels.every((l) => l >= 29 && l < 31)).toBe(true);
  });

  it('respects a known level', () => {
    const obs = { ...observe({ atk: 10, def: 10, hp: 10 }, 25), level: 25 };
    expect(inferSpreads(obs).every((m) => m.level === 25)).toBe(true);
  });

  it('returns nothing when no spread fits', () => {
    expect(inferSpreads({ base: azumarill, cp: 99999, mods: normal })).toEqual([]);
  });
});

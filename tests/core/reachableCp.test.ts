import { describe, expect, it } from 'vitest';
import { reachableCps } from '../../src/core/reachableCp';
import { battleStats, cp } from '../../src/core/stats';

const skarmory = { atk: 148, def: 226, hp: 163 };
const normal = { variant: 'normal', lucky: false } as const;
const spread = { base: skarmory, ivs: { atk: 10, def: 4, hp: 12 }, level: 21 };

describe('reachableCps', () => {
  it('holds the CP of every spread and level that gives the HP read', () => {
    const cps = reachableCps({ base: skarmory, mods: normal, hp: battleStats(spread).hp });
    expect([cps.has(cp(spread)), cps.has(161)]).toEqual([true, false]);
  });

  it('keeps to the IVs read, when the bars were read', () => {
    const cps = reachableCps({ base: skarmory, mods: normal, hp: battleStats(spread).hp, ivs: spread.ivs });
    expect(cps.has(cp(spread))).toBe(true);
    expect(cps.size).toBeLessThan(4);
  });

  it('keeps to the levels the power-up cost allows', () => {
    const all = reachableCps({ base: skarmory, mods: normal });
    const costed = reachableCps({ base: skarmory, mods: normal, dust: 2500 });
    expect(costed.has(cp(spread))).toBe(true);
    expect(costed.size).toBeLessThan(all.size / 4);
  });
});

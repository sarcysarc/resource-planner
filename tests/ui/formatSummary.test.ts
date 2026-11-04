import { describe, expect, it } from 'vitest';
import { formatChange, formatSummary } from '../../src/ui/format';

const base = {
  eligible: true, targetLevel: 40, effectiveLevel: 40, cp: 3000, value: 13.71,
  cost: { stardust: 0, candy: 0, xl: 0 }, parts: [],
} as const;

describe('formatSummary for raids', () => {
  it('gives damage per second and the moves used', () => {
    const r = { ...base, basis: 'raidDps', moves: { fast: 'Waterfall', charged: 'Hydro Pump' } } as const;
    expect(formatSummary(r)).toBe('Power up to level 40 for CP 3,000: 13.7 damage per second with Waterfall and Hydro Pump');
  });

  it('keeps the Attack wording when moves are not known', () => {
    expect(formatSummary({ ...base, basis: 'attack', value: 200 })).toBe('Power up to level 40 for CP 3,000: Attack 200.0');
  });
});

describe('formatSummary for leagues', () => {
  it('says where the IVs rank and notes the Best Buddy level', () => {
    const rank = { rank: 215, percent: 97.94, bestProduct: 1 };
    const r = { ...base, basis: 'statProduct', effectiveLevel: 41, cp: 1499, rank } as const;
    expect(formatSummary(r)).toBe('Power up to level 40 (+1 as Best Buddy) for CP 1,499: its IVs rank 215 of 4,096 for this league (97.9% of the best)');
  });
});

describe('formatChange', () => {
  it('says how much stronger or weaker', () => {
    expect([formatChange(0.067), formatChange(-0.02)]).toEqual(['6.7% stronger than the current one', '2.0% weaker than the current one']);
  });

  it('calls a change too small to show the same, never -0.0%', () => {
    expect([formatChange(-0.0003), formatChange(0.0004), formatChange(0)]).toEqual(Array(3).fill('As strong as the current one'));
  });
});

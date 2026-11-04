import { describe, expect, it } from 'vitest';
import { formatChange, formatSummary } from '../../src/ui/format';

const base = {
  eligible: true, targetLevel: 40, effectiveLevel: 40, cp: 3000, value: 13.71,
  cost: { stardust: 0, candy: 0, xl: 0 }, parts: [],
} as const;

describe('formatSummary for raids', () => {
  it('gives damage per second and the moves used', () => {
    const r = { ...base, basis: 'raidDps', moves: { fast: 'Waterfall', charged: 'Hydro Pump' } } as const;
    expect(formatSummary(r)).toBe('Power up to Lv 40 · CP 3,000 · 13.7 damage per second with Waterfall and Hydro Pump');
  });

  it('keeps the Attack wording when moves are not known', () => {
    expect(formatSummary({ ...base, basis: 'attack', value: 200 })).toBe('Power up to Lv 40 · CP 3,000 · Attack 200.0');
  });
});

describe('formatChange', () => {
  it('gives the change with its sign', () => {
    expect([formatChange(0.067), formatChange(-0.02)]).toEqual(['+6.7% vs current', '-2.0% vs current']);
  });

  it('calls a change too small to show the same, never -0.0%', () => {
    expect([formatChange(-0.0003), formatChange(0.0004), formatChange(0)]).toEqual(Array(3).fill('Same as current'));
  });
});

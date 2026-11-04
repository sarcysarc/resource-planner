import { describe, expect, it } from 'vitest';
import { evaluateGoal } from '../../src/core/goals';
import { purified } from '../../src/core/purify';
import { candidate } from './fixtures';

const shadow = candidate({ mods: { variant: 'shadow', lucky: false }, ivs: { atk: 4, def: 14, hp: 13 }, level: 20 });
const cost = { stardust: 3000, candy: 3 };

describe('purified (ADR 0006)', () => {
  it('raises each IV by 2 up to 15 and the level to 25', () => {
    const p = purified(shadow, cost);
    expect(p.ivs).toEqual({ atk: 6, def: 15, hp: 15 });
    expect(p.level).toBe(25);
    expect(p.mods.variant).toBe('purified');
  });

  it('keeps a level above 25', () => {
    expect(purified({ ...shadow, level: 30 }, cost).level).toBe(30);
  });

  it('adds the purify cost as its own part', () => {
    const result = evaluateGoal({ candidate: purified(shadow, cost), goal: 'master' });
    if (!result.eligible) throw new Error('expected eligible');
    expect(result.parts[0]).toEqual({ kind: 'purify', cost: { stardust: 3000, candy: 3, xl: 0 } });
    const powerUps = result.parts.find((p) => p.kind === 'powerUps')!.cost;
    expect(result.cost.stardust).toBe(powerUps.stardust + 3000);
  });

  it('gives the evolve Candy the Purified discount', () => {
    expect(purified({ ...shadow, evolveCandy: 125 }, cost).evolveCandy).toBe(113);
  });
});

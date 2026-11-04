import { describe, expect, it } from 'vitest';
import { evaluateGoal } from '../../src/core/goals';
import { powerUpCost } from '../../src/core/cost';
import { battleStats } from '../../src/core/stats';
import { candidate } from './fixtures';

const normal = { variant: 'normal', lucky: false } as const;

describe('evaluateGoal: leagues', () => {
  it('targets the highest level under the cap and costs the remaining power-ups', () => {
    const r = evaluateGoal({ candidate: candidate(), goal: 'great' });
    if (!r.eligible) throw new Error('expected eligible');
    expect(r.targetLevel).toBe(43);
    expect(r.cp).toBeLessThanOrEqual(1500);
    expect(r.cost).toEqual(powerUpCost({ from: 20, to: 43, mods: normal }));
    expect(r.rank?.rank).toBeGreaterThan(0);
  });

  it('uses the Best Buddy level for free', () => {
    const r = evaluateGoal({ candidate: candidate({ bestBuddy: true }), goal: 'great' });
    if (!r.eligible) throw new Error('expected eligible');
    expect(r.effectiveLevel).toBe(43);
    expect(r.targetLevel).toBe(42);
  });

  it('marks a Pokémon already over the cap as ineligible', () => {
    const r = evaluateGoal({ candidate: candidate({ ivs: { atk: 15, def: 15, hp: 15 }, level: 45 }), goal: 'great' });
    expect(r).toEqual({ eligible: false, reason: 'over-cap' });
  });

  it('adds the second move and evolution costs', () => {
    const r = evaluateGoal({ candidate: candidate({ secondMoveUnlocked: false, evolveCandy: 100 }), goal: 'great' });
    if (!r.eligible) throw new Error('expected eligible');
    const base = powerUpCost({ from: 20, to: 43, mods: normal });
    expect(r.cost).toEqual({ stardust: base.stardust + 50000, candy: base.candy + 150, xl: base.xl });
  });
});

describe('evaluateGoal: trainer level', () => {
  it('powers up no further than the trainer allows', () => {
    const r = evaluateGoal({ candidate: candidate({ maxLevel: 35 }), goal: 'master' });
    if (!r.eligible) throw new Error('expected eligible');
    expect(r.targetLevel).toBe(35);
    expect(r.cost).toEqual(powerUpCost({ from: 20, to: 35, mods: normal }));
  });

  it('keeps the Best Buddy level on top of the limit', () => {
    const r = evaluateGoal({ candidate: candidate({ maxLevel: 35, bestBuddy: true }), goal: 'master' });
    if (!r.eligible) throw new Error('expected eligible');
    expect([r.targetLevel, r.effectiveLevel]).toEqual([35, 36]);
  });

  it('leaves a Pokémon above the limit where it is, at no cost', () => {
    const r = evaluateGoal({ candidate: candidate({ level: 30, maxLevel: 25 }), goal: 'master' });
    if (!r.eligible) throw new Error('expected eligible');
    expect(r.targetLevel).toBe(30);
    expect(r.cost).toEqual({ stardust: 0, candy: 0, xl: 0 });
  });
});

describe('evaluateGoal: uncapped goals', () => {
  it('powers to 50 for Master League', () => {
    const r = evaluateGoal({ candidate: candidate(), goal: 'master' });
    if (!r.eligible) throw new Error('expected eligible');
    expect(r.targetLevel).toBe(50);
    expect(r.cost.xl).toBe(296);
  });

  it('scores raids on Attack with the Shadow bonus', () => {
    const shadow = candidate({ mods: { variant: 'shadow', lucky: false } });
    const r = evaluateGoal({ candidate: shadow, goal: 'raid' });
    if (!r.eligible) throw new Error('expected eligible');
    const atk = battleStats({ base: shadow.base, ivs: shadow.ivs, level: 50 }).atk;
    expect(r.value).toBeCloseTo(atk * 1.2, 6);
    expect(r.rank).toBeUndefined();
  });

  it('costs nothing for a Pokémon already at the goal', () => {
    const r = evaluateGoal({ candidate: candidate({ level: 50 }), goal: 'raid' });
    if (!r.eligible) throw new Error('expected eligible');
    expect(r.cost).toEqual({ stardust: 0, candy: 0, xl: 0 });
  });
});

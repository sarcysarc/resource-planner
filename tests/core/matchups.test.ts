import { describe, expect, it } from 'vitest';
import { type Fighter, matchup, tally } from '../../src/core/matchups';

const fighter = (over: Partial<Fighter> = {}): Fighter => ({
  stats: { atk: 120, def: 120, hp: 140 }, types: ['water'], variant: 'normal',
  fast: { power: 10, type: 'water' }, ...over,
});

describe('matchup', () => {
  it('gives the damage per fast move dealt and taken, PvP formula', () => {
    // dealt: floor(0.5 × 10 × 1.3) + 1 = 7; taken: grass into water, floor(0.5 × 10 × 1.6 × 1.3) + 1 = 11
    const them = fighter({ types: ['fire'], fast: { power: 10, type: 'grass' } });
    const me = fighter({ fast: { power: 10, type: 'normal' } });
    expect(matchup(me, them)).toEqual({ dealt: 7, taken: 11 });
  });

  it('lets a Shadow deal more and take more', () => {
    const them = fighter();
    const plain = matchup(fighter(), them);
    const shadow = matchup(fighter({ variant: 'shadow' }), them);
    expect(shadow.dealt).toBeGreaterThan(plain.dealt);
    expect(shadow.taken).toBeGreaterThan(plain.taken);
  });
});

describe('tally', () => {
  it('counts opponents where the option deals more or less, and takes less or more', () => {
    const current = [{ dealt: 5, taken: 5 }, { dealt: 5, taken: 5 }, { dealt: 5, taken: 5 }];
    const other = [{ dealt: 6, taken: 4 }, { dealt: 4, taken: 5 }, { dealt: 5, taken: 6 }];
    expect(tally(current, other)).toEqual({ moreDealt: 1, lessDealt: 1, lessTaken: 1, moreTaken: 1, of: 3 });
  });
});

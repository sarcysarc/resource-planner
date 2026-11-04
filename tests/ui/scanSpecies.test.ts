import { describe, expect, it } from 'vitest';
import { battleStats, cp } from '../../src/core/stats';
import { resolveSpecies } from '../../src/ui/scanSpecies';
import { findSpecies, loadBundledIndex } from '../../src/ui/species';

const index = loadBundledIndex();
const ids = (reading: Parameters<typeof resolveSpecies>[1]) => resolveSpecies(index, reading).map((s) => s.id);

// What a level 30 Aggron with 15/15/15 shows.
const aggron = { base: findSpecies(index, 'aggron')!.base, ivs: { atk: 15, def: 15, hp: 15 }, level: 30 };
const seen = { cp: cp(aggron), hp: battleStats(aggron).hp };

describe('resolveSpecies', () => {
  it('takes a printed species name', () => {
    expect(ids({ name: 'Aggron' })).toEqual(['aggron']);
  });

  it('falls back to the Candy family under a nickname, keeping members whose stats fit', () => {
    expect(ids({ name: 'Rocky', family: 'ARON', ...seen })).toEqual(['aggron']);
  });

  it('keeps every family member when the numbers do not decide', () => {
    expect(ids({ family: 'ARON' })).toEqual(['aron', 'lairon', 'aggron']);
  });

  it('uses read IVs to narrow the family further', () => {
    expect(ids({ family: 'ARON', ...seen, ivs: { atk: 0, def: 0, hp: 0 } })).toEqual(['aron', 'lairon', 'aggron']);
    expect(ids({ family: 'ARON', ...seen, ivs: aggron.ivs })).toEqual(['aggron']);
  });

  it('finds nothing for an unknown name and family', () => {
    expect(ids({ name: 'Rocky', family: 'RLAX' })).toEqual([]);
  });
});

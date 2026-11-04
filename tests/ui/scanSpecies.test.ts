import { describe, expect, it } from 'vitest';
import { battleStats, cp } from '../../src/core/stats';
import { readingFamily, resolveSpecies } from '../../src/ui/scanSpecies';
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
    expect(ids({ family: 'ARON', ...seen, ivs: aggron.ivs })).toEqual(['aggron']);
  });

  it('narrows by CP and HP alone when the read IVs fit no member', () => {
    expect(ids({ family: 'ARON', ...seen, ivs: { atk: 0, def: 1, hp: 2 } })).toEqual(['aggron']);
  });

  it('drops a Lucky flag no member fits, as from another Pokémon’s appraisal', () => {
    expect(ids({ family: 'SNORLAX', cp: 1177, hp: 163, dust: 1920, variant: 'shadow', lucky: true })).toEqual(['snorlax']);
  });

  it('finds nothing for an unknown name and family', () => {
    expect(ids({ name: 'Rocky', family: 'QZQX' })).toEqual([]);
  });

  it('takes a name misread by a letter', () => {
    expect(ids({ name: 'Aggran' })).toEqual(['aggron']);
  });

  it('takes a family label misread by a letter, or cut to a part only one family has', () => {
    expect(ids({ family: 'ARQN' })).toEqual(['aron', 'lairon', 'aggron']);
    expect(ids({ name: 'Srerax', family: 'RLAX' })).toEqual(['snorlax', 'munchlax']);
  });

  it('does not guess between families a short scrap could belong to', () => {
    expect(ids({ family: 'ON' })).toEqual([]);
  });
});

describe('readingFamily', () => {
  it('tells the Candy family from a species name or the family label', () => {
    expect([readingFamily(index, { name: 'Lairon' }), readingFamily(index, { family: 'ARON' })]).toEqual(['FAMILY_ARON', 'FAMILY_ARON']);
    expect(readingFamily(index, { name: 'Rocky' })).toBeUndefined();
  });
});

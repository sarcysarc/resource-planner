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

  // The game shows "Giratina"; the data only has its forms (ADR 0016, cause B).
  describe('a name the data only has as forms', () => {
    const shows = (id: string) => {
      const pokemon = { base: findSpecies(index, id)!.base, ivs: { atk: 12, def: 15, hp: 13 }, level: 30 };
      return { cp: cp(pokemon), hp: battleStats(pokemon).hp, ivs: pokemon.ivs };
    };

    it('takes the one form whose stats fit the numbers', () => {
      expect(ids({ name: 'Giratina', ...shows('giratina_origin') })).toEqual(['giratina_origin']);
      expect(ids({ name: 'Giratina', ...shows('giratina_altered') })).toEqual(['giratina_altered']);
      expect(ids({ name: 'Indeedee', ...shows('indeedee_male') })).toEqual(['indeedee_male']);
    });

    it('keeps every form when the numbers do not decide, so step 1 asks', () => {
      expect(ids({ name: 'Giratina' })).toEqual(['giratina_altered', 'giratina_origin']);
    });

    it('allows a misread letter', () => {
      expect(ids({ name: 'Glratina', ...shows('giratina_origin') })).toEqual(['giratina_origin']);
    });

    it('finds the forms from the Candy label too', () => {
      expect(ids({ family: 'GIRATINA' })).toEqual(['giratina_altered', 'giratina_origin']);
    });

    it('groups by the form found', () => {
      expect(readingFamily(index, { name: 'Giratina', ...shows('giratina_origin') })).toBe('giratina_origin');
    });
  });

  // The game shows "Mewtwo" for Armored Mewtwo and "Meowth" for Alolan Meowth (issue #4).
  describe('a species name the game also shows its forms by', () => {
    const shows = (id: string, ivs = { atk: 15, def: 15, hp: 15 }, level = 20) => {
      const pokemon = { base: findSpecies(index, id)!.base, ivs, level };
      return { cp: cp(pokemon), hp: battleStats(pokemon).hp, ivs };
    };

    it('takes the form whose stats fit the numbers', () => {
      expect(ids({ name: 'Mewtwo', ...shows('mewtwo_armored') })).toEqual(['mewtwo_armored']);
      expect(ids({ name: 'Electrode', ...shows('electrode_hisuian') })).toEqual(['electrode_hisuian']);
    });

    it('keeps the plain species when its stats fit and no form’s do', () => {
      expect(ids({ name: 'Mewtwo', ...shows('mewtwo') })).toEqual(['mewtwo']);
    });

    it('keeps each form that fits, so step 1 asks', () => {
      const { cp, hp } = shows('meowth_alolan', undefined, 10);
      expect(ids({ name: 'Meowth', cp, hp })).toEqual(['meowth', 'meowth_alolan', 'meowth_galarian']);
    });

    it('leaves out forms with the plain species’ stats, which the numbers cannot tell apart', () => {
      expect(ids({ name: 'Pikachu', ...shows('pikachu') })).toEqual(['pikachu']);
      expect(ids({ name: 'Castform', ...shows('castform') })).toEqual(['castform']);
    });

    it('takes the plain species when no CP was read', () => {
      expect(ids({ name: 'Mewtwo', hp: 150 })).toEqual(['mewtwo']);
    });
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

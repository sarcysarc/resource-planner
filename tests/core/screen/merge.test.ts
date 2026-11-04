import { describe, expect, it } from 'vitest';
import { splitAccount } from '../../../src/core/screen/account';
import { groupReadings, mergeReadings } from '../../../src/core/screen/merge';
import type { Reading } from '../../../src/core/screen/types';

// Made-up readings. A family is known from the family label or a species name.
const FAMILIES: Record<string, string> = { Lairon: 'ARON', Aggron: 'ARON', Snorlax: 'SNORLAX' };
const familyOf = (r: Reading) => r.family ?? (r.name ? FAMILIES[r.name] : undefined);

const top: Reading = { name: 'Lairon', cp: 600, hp: 80, dust: 1300 };
const bottom: Reading = { family: 'ARON', secondMove: false, totals: { stardust: 1000, candy: 9 } };
const appraisal: Reading = { name: 'Lairon', cp: 600, hp: 80, ivs: { atk: 1, def: 2, hp: 3 } };
const other: Reading = { name: 'Snorlax', cp: 2000, hp: 200 };

describe('mergeReadings', () => {
  it('combines the values of several screenshots', () => {
    expect(mergeReadings([top, appraisal])).toEqual({
      reading: { ...top, ivs: appraisal.ivs },
      conflicts: [],
      shots: 2,
    });
  });

  it('leaves out a value the screenshots disagree on and lists it', () => {
    const merged = mergeReadings([top, { ...appraisal, cp: 601 }]);
    expect(merged.reading.cp).toBeUndefined();
    expect(merged.conflicts).toEqual([{ field: 'cp', values: [600, 601] }]);
  });

  it('compares IVs by value', () => {
    expect(mergeReadings([appraisal, { ...appraisal }]).conflicts).toEqual([]);
  });

  it('takes the newest total, since totals change between screenshots', () => {
    const later: Reading = { totals: { stardust: 900 } };
    expect(mergeReadings([bottom, later]).reading.totals).toEqual({ stardust: 900, candy: 9 });
  });

  it('prefers the appraisal footer name over a nickname, without asking', () => {
    const merged = mergeReadings([{ ...top, name: 'Rocky' }, appraisal]);
    expect([merged.reading.name, merged.conflicts]).toEqual(['Lairon', []]);
    expect(mergeReadings([{ ...top, name: 'Rocky' }, top]).reading.name).toBeUndefined();
  });
});

describe('groupReadings', () => {
  it('groups screenshots of the same Pokémon by CP and HP', () => {
    const groups = groupReadings([top, other, appraisal], familyOf);
    expect(groups.map((g) => [g.reading.name, g.shots])).toEqual([['Lairon', 2], ['Snorlax', 1]]);
  });

  it('keeps Pokémon of a different family apart even at the same CP and HP', () => {
    const groups = groupReadings([top, { ...other, cp: 600, hp: 80 }], familyOf);
    expect(groups).toHaveLength(2);
  });

  it('adds a scrolled-down screenshot to the one Pokémon of its family', () => {
    const groups = groupReadings([top, other, bottom], familyOf);
    expect(groups[0].reading).toMatchObject({ cp: 600, secondMove: false, totals: { candy: 9 } });
    expect(groups).toHaveLength(2);
  });

  describe('when two Pokémon of its family could own a scrolled-down screenshot', () => {
    const twin: Reading = { name: 'Aggron', cp: 1500, hp: 120, dust: 5000 };
    const shots = (groups: ReturnType<typeof groupReadings>) => groups.map((g) => [g.reading.cp, g.shots]);

    it('picks the one with the same power-up cost', () => {
      expect(shots(groupReadings([top, twin, { ...bottom, dust: 1300 }], familyOf))).toEqual([[600, 2], [1500, 1]]);
    });

    it('otherwise picks the one screenshotted just before it', () => {
      expect(shots(groupReadings([twin, top, bottom], familyOf))).toEqual([[1500, 1], [600, 2]]);
      expect(shots(groupReadings([top, twin, bottom], familyOf))).toEqual([[600, 1], [1500, 2]]);
    });

    it('or just after it, when it came first', () => {
      expect(shots(groupReadings([bottom, top, twin], familyOf))).toEqual([[600, 2], [1500, 1]]);
    });
  });

  it('keeps a scrolled-down screenshot apart when no Pokémon of its family was read', () => {
    expect(groupReadings([other, bottom], familyOf)).toHaveLength(2);
  });

  it('keeps the screenshots in order, so the newest total wins', () => {
    const later: Reading = { ...top, totals: { stardust: 900 } };
    expect(groupReadings([bottom, later], familyOf)[0].reading.totals).toEqual({ stardust: 900, candy: 9 });
  });

  it('gives a misread family label its full name rather than a clash', () => {
    const loose = (r: Reading) => (r.family === 'RLAX' ? 'SNORLAX' : familyOf(r));
    const [group] = groupReadings([{ ...other, family: 'SNORLAX' }, { family: 'RLAX', ivs: { atk: 1, def: 2, hp: 3 } }], loose);
    expect(group.conflicts).toEqual([]);
    expect(group.reading.family).toBe('SNORLAX');
  });

  it('skips screenshots that gave nothing', () => {
    expect(groupReadings([{}, top, {}], familyOf).map((g) => g.shots)).toEqual([1]);
  });
});

describe('splitAccount', () => {
  const bag: Reading = { totals: { rareCandy: 12, rareXl: 7 } };
  const profile: Reading = { totals: { trainerLevel: 30 } };

  it('keeps bag and profile screenshots apart from the Pokémon, newest value first', () => {
    const later: Reading = { totals: { rareCandy: 10 } };
    const { pokemon, account } = splitAccount([bag, top, profile, bottom, later]);
    expect(pokemon).toEqual([top, bottom]);
    expect(account).toEqual({ rareCandy: 10, rareXl: 7, trainerLevel: 30 });
  });

  it('takes nothing from Pokémon screens, whose totals belong to their family', () => {
    expect(splitAccount([top, bottom]).account).toEqual({});
  });
});

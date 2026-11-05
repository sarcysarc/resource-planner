import { describe, expect, it } from 'vitest';
import { battleStats, cp } from '../../src/core/stats';
import { checkCp } from '../../src/ui/cpCheck';
import { findSpecies, loadBundledIndex } from '../../src/ui/species';

const index = loadBundledIndex();
// What a level 21 Skarmory with 10/4/12 shows.
const skarmory = { base: findSpecies(index, 'skarmory')!.base, ivs: { atk: 10, def: 4, hp: 12 }, level: 21 };
const real = cp(skarmory);
const hp = battleStats(skarmory).hp;
const dropFirst = Number(String(real).slice(1));

describe('checkCp', () => {
  it('keeps a CP that fits the species and HP, and drops the other readings', () => {
    expect(checkCp(index, { name: 'Skarmory', cp: real, cpOptions: [real + 1000], hp })).toEqual({ name: 'Skarmory', cp: real, hp });
  });

  it('takes the other reading of the band that fits, when the CP does not', () => {
    expect(checkCp(index, { name: 'Skarmory', cp: dropFirst, cpOptions: [real], hp }).cp).toBe(real);
    expect(checkCp(index, { name: 'Skarmory', cpOptions: [real], hp }).cp).toBe(real);
  });

  it('puts back a digit OCR lost, when only one CP with it fits the HP and IVs', () => {
    expect(checkCp(index, { name: 'Skarmory', cp: dropFirst, hp, ivs: skarmory.ivs }).cp).toBe(real);
  });

  it('leaves the CP blank and keeps what was read, when no single CP fits', () => {
    expect(checkCp(index, { name: 'Skarmory', cp: 9999, hp })).toEqual({ name: 'Skarmory', hp, cpDoubt: 9999 });
  });

  it('judges by the Candy family when the name is not read', () => {
    expect(checkCp(index, { family: 'SKARMORY', cp: dropFirst, cpOptions: [real], hp }).cp).toBe(real);
  });

  // The game names Armored Mewtwo just "Mewtwo", so every form shown by that name counts.
  it('counts the forms the game shows by the same name', () => {
    const armored = { base: findSpecies(index, 'mewtwo_armored')!.base, ivs: { atk: 15, def: 15, hp: 15 }, level: 20 };
    const reading = { name: 'Mewtwo', cp: cp(armored), hp: battleStats(armored).hp };
    expect(checkCp(index, reading)).toEqual(reading);
  });

  it('keeps what was read when the species is not known', () => {
    expect(checkCp(index, { cp: 161, cpOptions: [1161], hp: 103 })).toEqual({ cp: 161, hp: 103 });
  });
});

import { describe, expect, it } from 'vitest';
import { levelFromCp, maxLevelUnderCap, powerUpLimit } from '../../src/core/levels';
import { cp } from '../../src/core/stats';

const azumarill = { atk: 112, def: 152, hp: 225 };
const medicham = { atk: 121, def: 152, hp: 155 };
const mewtwo = { atk: 300, def: 182, hp: 214 };

describe('maxLevelUnderCap', () => {
  it('matches PvPoke default Great League levels', () => {
    expect(maxLevelUnderCap({ base: azumarill, ivs: { atk: 4, def: 15, hp: 13 }, cap: 1500, maxLevel: 50 })).toBe(43);
    expect(maxLevelUnderCap({ base: medicham, ivs: { atk: 7, def: 15, hp: 14 }, cap: 1500, maxLevel: 50 })).toBe(49);
  });

  it('stops at maxLevel when the cap is never reached', () => {
    expect(maxLevelUnderCap({ base: mewtwo, ivs: { atk: 15, def: 15, hp: 15 }, cap: Infinity, maxLevel: 51 })).toBe(51);
  });

  it('returns null when even level 1 is over the cap', () => {
    expect(maxLevelUnderCap({ base: mewtwo, ivs: { atk: 15, def: 15, hp: 15 }, cap: 5, maxLevel: 50 })).toBeNull();
  });
});

describe('levelFromCp', () => {
  it('recovers the level from CP', () => {
    const ivs = { atk: 10, def: 12, hp: 14 };
    const value = cp({ base: azumarill, ivs, level: 27.5 });
    expect(levelFromCp({ base: azumarill, ivs, cp: value })).toBe(27.5);
  });

  it('returns null when no level matches', () => {
    expect(levelFromCp({ base: azumarill, ivs: { atk: 0, def: 0, hp: 0 }, cp: 99999 })).toBeNull();
  });
});

describe('powerUpLimit', () => {
  it('is ten levels above the trainer, up to 50', () => {
    expect(powerUpLimit(25)).toBe(35);
    expect(powerUpLimit(40)).toBe(50);
    expect(powerUpLimit(45)).toBe(50);
  });

  it('is 50 when the trainer level is not known', () => {
    expect(powerUpLimit(undefined)).toBe(50);
  });
});

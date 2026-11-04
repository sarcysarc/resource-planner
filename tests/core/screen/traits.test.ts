import { describe, expect, it } from 'vitest';
import { readEvolveCandy, readLucky, readVariant } from '../../../src/core/screen/traits';

// Lines as OCR gives them, junk included. Places are left out on purpose.
const lines = (text: string) => text.split('\n');

describe('readVariant', () => {
  it('sees a Shadow Pokémon by its Purify button', () => {
    expect(readVariant(lines('GYMS & RAIDS\nPURIFY i500 £5'))).toBe('shadow');
  });

  it('sees a Shadow Pokémon by the Shadow bonus under its moves, however OCR spells it', () => {
    expect(readVariant(lines('(0) Bite\nSHADOW BONLIS'))).toBe('shadow');
    expect(readVariant(lines('(®) sHapow BONUS'))).toBe('shadow');
  });

  it('sees a Purified Pokémon by Return and a Grunt origin without a Purify button', () => {
    expect(readVariant(lines('© Return =)\nR CAUGHT AFTER DEFEATING GRUNT sy'))).toBe('purified');
  });

  it('does not call a Shadow Pokémon purified', () => {
    expect(readVariant(lines('© Return\nPURIFY i500 £5\nCAUGHT AFTER DEFEATING GRUNT'))).toBe('shadow');
  });

  it('says nothing when there is no sign either way', () => {
    expect(readVariant(lines('© Return =)\nCAUGHT IN THE WILD'))).toBeUndefined();
  });
});

describe('readLucky', () => {
  it('sees the Lucky label, with or without the accent and junk after it', () => {
    expect(readLucky(lines('LUCKY POKEMON ©'))).toBe(true);
    expect(readLucky(lines('LUCKY POKÉMON'))).toBe(true);
  });

  it('says nothing otherwise, since the label can be off screen', () => {
    expect(readLucky(lines('GYMS & RAIDS'))).toBeUndefined();
  });
});

describe('readEvolveCandy', () => {
  it('reads the Candy cost next to EVOLVE, including the Purified discount', () => {
    expect(readEvolveCandy(lines('EVOLVE £50'))).toBe(50);
    expect(readEvolveCandy(lines('EVOLVE £45'))).toBe(45);
    expect(readEvolveCandy(lines('EVOLVE 25'))).toBe(25);
  });

  it('ignores a number that is no Candy cost', () => {
    expect(readEvolveCandy(lines('EVOLVE 37'))).toBeUndefined();
  });

  it('drops a Candy icon read as a leading digit', () => {
    expect(readEvolveCandy(lines('EVOLVE 9100'))).toBe(100);
  });

  it('ignores Mega Evolution', () => {
    expect(readEvolveCandy(lines('MEGA\nEVOLVE ¥ 200'))).toBeUndefined();
    expect(readEvolveCandy(lines('MEGA EVOLVE 200'))).toBeUndefined();
  });

  it('says nothing when there is no EVOLVE button', () => {
    expect(readEvolveCandy(lines('POWER UP 9,000 12'))).toBeUndefined();
  });
});

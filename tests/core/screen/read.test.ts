import { describe, expect, it } from 'vitest';
import { readScan } from '../../../src/core/screen/read';
import { wordsOf } from './wordsOf';

const normal = { variant: 'normal', lucky: false } as const;
const scan = (text: string, cpText = '') => ({ words: wordsOf(text), cpText, digits: {} });

describe('readScan', () => {
  it('reads the Pokémon screen', () => {
    expect(readScan(scan('Snorlax\n132 / 132 HP\nPOWER UP 9,000 12', '2251'), normal)).toEqual({ cp: 2251, hp: 132, dust: 9000, name: 'Snorlax' });
  });

  it('adds appraisal IVs', () => {
    const appraisal = { ...scan('This Snorlax was caught on 1/2/2026'), ivs: { atk: 1, def: 2, hp: 3 } };
    expect(readScan(appraisal, normal)).toEqual({ ivs: { atk: 1, def: 2, hp: 3 }, name: 'Snorlax' });
  });

  it('reads the family, variant, Lucky label, second move and evolve cost', () => {
    const text = 'LUCKY POKEMON\n80 / 80 HP\nSTARDUST ARON CANDY\nEVOLVE 50\nGYMS & RAIDS\nO Lick\n© Return\n© Thunder\nCAUGHT AFTER DEFEATING GRUNT';
    expect(readScan(scan(text), normal)).toMatchObject({ family: 'ARON', variant: 'purified', lucky: true, secondMove: true, evolveCandy: 50 });
  });

  it('judges the Stardust cost by the variant on the screen, not the form', () => {
    expect(readScan(scan('80 / 80 HP\nPURIFY\nPOWER UP 14,400 24'), normal)).toMatchObject({ variant: 'shadow', dust: 14400 });
    expect(readScan(scan('LUCKY POKEMON\n80 / 80 HP\nPOWER UP 7,500 20'), normal)).toMatchObject({ lucky: true, dust: 7500 });
  });

  it('adds the Stardust and Candy totals from the second pass', () => {
    const totals = { ...scan('80 / 80 HP\n123,456 9\nSTARDUST ARON CANDY'), digits: { stardust: '123,456', candy: '9' } };
    expect(readScan(totals, normal)).toMatchObject({ totals: { stardust: 123456, candy: 9 } });
  });

  it('ignores numbers on a screen it does not know', () => {
    expect(readScan(scan('Settings\nEVOLVE 50', '1499'), normal)).toEqual({});
  });
});

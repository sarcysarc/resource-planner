import { describe, expect, it } from 'vitest';
import { pokemonRegions, readCp, readPokemon } from '../../../src/core/screen/pokemon';
import type { Scan } from '../../../src/core/screen/types';
import type { Modifiers } from '../../../src/core/types';
import { wordsOf } from './wordsOf';

const normal: Modifiers = { variant: 'normal', lucky: false };
const scan = (text: string, extra: Partial<Scan> = {}): Scan => ({ words: wordsOf(text), cpText: '', digits: {}, ...extra });
const read = (text: string, mods = normal) => readPokemon(scan(text), mods);

const SCREEN = `CP1499
Azumarill
191 / 191 HP
WATER FAIRY
123,456 87
STARDUST AZUMARILL CANDY
POWER UP 9,000 12`;

describe('readPokemon', () => {
  it('reads CP, HP and the next power-up Stardust from the Pokémon screen', () => {
    expect(read(SCREEN)).toEqual({ cp: 1499, hp: 191, dust: 9000 });
  });

  it('tolerates the spacing OCR produces', () => {
    expect(read('CP 1499\n191/191HP\nPOWER UP 9000 12')).toEqual({ cp: 1499, hp: 191, dust: 9000 });
  });

  it('takes maximum HP when the Pokémon is hurt', () => {
    expect(read('CP 600\n87 / 191 HP').hp).toBe(191);
  });

  it('reads the cost from the line after POWER UP when OCR splits them', () => {
    expect(read('POWER UP\n9,000 12').dust).toBe(9000);
  });

  it('ignores the Stardust total even when it looks like a cost', () => {
    expect(read('4000 87\nSTARDUST CANDY\nPOWER UP').dust).toBeUndefined();
  });

  it('only accepts costs that exist for the chosen options', () => {
    const shadow = { variant: 'shadow', lucky: false } as const;
    const lucky = { variant: 'normal', lucky: true } as const;
    expect(read('POWER UP 14,400 24', shadow).dust).toBe(14400);
    expect(read('POWER UP 14,400 24').dust).toBeUndefined();
    expect(read('POWER UP 7,500 20', lucky).dust).toBe(7500);
  });

  it('prefers the digits re-read next to POWER UP over the first pass', () => {
    expect(readPokemon(scan('POWER UP §7,O00 ss', { digits: { cost: '7,000 8' } }), normal).dust).toBe(7000);
  });

  it('falls back to the first pass when the re-read is not a real cost', () => {
    expect(readPokemon(scan('POWER UP 9,000 12', { digits: { cost: '7001' } }), normal).dust).toBe(9000);
  });

  it('prefers CP from the cropped CP band', () => {
    expect(readPokemon(scan('cr 999\n85 / 85 HP', { cpText: '«615 ou.' }), normal).cp).toBe(615);
  });

  it('ignores the CP band on a screen scrolled past CP and HP', () => {
    const scrolled = scan('135,770 8\nSTARDUST ARON CANDY\nPOWER UP 7,000 8', { cpText: '135,770 8' });
    expect(readPokemon(scrolled, normal)).toEqual({ dust: 7000 });
  });

  it('accepts the small CP letters read as "cpr" or "cr"', () => {
    expect(['cpr545', 'cr370', 'cp546'].map((t) => read(t).cp)).toEqual([545, 370, 546]);
  });

  it('returns nothing for text that is not the Pokémon screen', () => {
    expect(read('Settings\nVersion 0.321.0')).toEqual({});
  });
});

describe('pokemonRegions', () => {
  it('asks for the area right of POWER UP to be re-read, white text on the button', () => {
    const { cost } = pokemonRegions(wordsOf('POWER UP 9,000 12'));
    expect(cost?.ink).toBe('white');
    expect(cost?.box.x0).toBeCloseTo(0.21);
  });

  it('asks for nothing when there is no POWER UP button', () => {
    expect(pokemonRegions(wordsOf('Settings'))).toEqual({});
  });
});

describe('readCp', () => {
  it('takes the first number in the cropped CP band', () => {
    expect(['«615 ou.', '+1335', '+545 ou'].map(readCp)).toEqual([615, 1335, 545]);
  });

  it('returns nothing when the band has no number', () => {
    expect(readCp('ou .')).toBeUndefined();
  });
});

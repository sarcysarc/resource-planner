import { describe, expect, it } from 'vitest';
import { readCp } from '../../../src/core/screen/cpBand';
import { pokemonRegions, readPokemon } from '../../../src/core/screen/pokemon';
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

  // The species is not known yet, so the other readings are kept for the check (fix C).
  it('keeps the other ways the band could read, with or without a CP', () => {
    expect(readPokemon(scan('103 / 103 HP', { cpText: 'crl161\n' }), normal)).toEqual({ cp: 161, cpOptions: [1161], hp: 103 });
    expect(readPokemon(scan('43 / 43 HP', { cpText: 'crb7/\n' }), normal)).toEqual({ cpOptions: [67], hp: 43 });
  });

  // The band read again with only the brightest white, for CPs on a pale sky (issue #5).
  describe('the bright band', () => {
    it('gives the CP when the first band has none', () => {
      expect(readPokemon(scan('56 / 56 HP', { cpText: '', cpBright: 'cr368\n' }), normal)).toEqual({ cp: 368, hp: 56 });
    });

    // A bare number may have lost digits to a sparkle erased with them, so it is only an option.
    it('adds its readings to the other ways the band could read', () => {
      const read = readPokemon(scan('87 / 87 HP', { cpText: '1\n', cpBright: '51\n' }), normal);
      expect(read).toEqual({ cpOptions: [51], hp: 87 });
    });

    it('leaves the first band’s CP first', () => {
      const read = readPokemon(scan('70 / 70 HP', { cpText: 'cr/72\n', cpBright: 'cpl72\n' }), normal);
      expect(read).toMatchObject({ cp: 772, cpOptions: expect.arrayContaining([172]) as unknown });
    });
  });

  it('ignores the CP band on a screen scrolled past CP and HP', () => {
    const scrolled = scan('135,770 8\nSTARDUST ARON CANDY\nPOWER UP 7,000 8', { cpText: '135,770 8' });
    expect(readPokemon(scrolled, normal)).toEqual({ dust: 7000 });
  });

  it('ignores the CP band when it holds the HP line, on a screen scrolled just past CP', () => {
    const scrolled = scan('132/132HP\nWEIGHT DRAGON / FLYING', { cpText: '132/132HP\n59.72kg' });
    expect(readPokemon(scrolled, normal).cp).toBeUndefined();
  });

  it('accepts a cost one above the table, as the game rounds some Shadow costs up', () => {
    const shadow = { variant: 'shadow', lucky: false } as const;
    expect(read('POWER UP 1,921 3', shadow).dust).toBe(1920);
  });

  it('accepts the small CP letters read as "cpr" or "cr"', () => {
    expect(['cpr545', 'cr370', 'cp546'].map((t) => read(t).cp)).toEqual([545, 370, 546]);
  });

  it('returns nothing for text that is not the Pokémon screen', () => {
    expect(read('Settings\nVersion 0.321.0')).toEqual({});
  });
});

describe('pokemonRegions', () => {
  it('asks for the costs right of POWER UP and EVOLVE to be re-read, in teal or red', () => {
    const { cost, evolve } = pokemonRegions(wordsOf('POWER UP 9,000 12\nEVOLVE 25'));
    expect([cost?.ink, evolve?.ink]).toEqual(['cost', 'cost']);
    expect(cost?.box.x0).toBeCloseTo(0.21);
    expect(evolve?.box.x0).toBeCloseTo(0.17);
  });

  it('asks for nothing when there is no POWER UP button', () => {
    expect(pokemonRegions(wordsOf('Settings'))).toEqual({});
  });
});

describe('readCp', () => {
  it('takes the first number in the cropped CP band', () => {
    expect(['«615 ou.', '+1335', '+545 ou'].map(readCp)).toEqual([615, 1335, 545]);
  });

  it('reads a slash before a digit as the 7 it was in the large CP font', () => {
    expect(['cr/14\nee\n', 'CP2/7/'].map(readCp)).toEqual([714, 277]);
  });

  it('drops a stray slash when reading it as 7 would give an impossible CP', () => {
    expect(readCp('044\ncp137/8 |”\n')).toBe(1378);
  });

  it('takes the number after the CP label over junk before it', () => {
    expect(readCp('384\ncr2488\n')).toBe(2488);
  });

  it('distrusts a number after a broken CP label, whose first digits were lost with it', () => {
    expect(readCp('Soa DA\nEs dks\nChk. 24\nhl\n')).toBeUndefined();
  });

  it('returns nothing when the band has no number', () => {
    expect(readCp('ou .')).toBeUndefined();
  });
});

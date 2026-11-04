import { describe, expect, it } from 'vitest';
import { readCp, readScreen } from '../../src/core/screenText';

const normal = { variant: 'normal', lucky: false } as const;

const SCREEN = `CP1499
Azumarill
191 / 191 HP
WATER FAIRY
12.34kg 0.81m
123,456 87
STARDUST AZUMARILL CANDY
POWER UP 9,000 12`;

describe('readScreen', () => {
  it('reads CP, HP and the next power-up Stardust from the Pokémon screen', () => {
    expect(readScreen(SCREEN, normal)).toEqual({ cp: 1499, hp: 191, dust: 9000 });
  });

  it('tolerates the spacing OCR produces', () => {
    const text = 'CP 1499\n191/191HP\nPOWER UP 9000 12';
    expect(readScreen(text, normal)).toEqual({ cp: 1499, hp: 191, dust: 9000 });
  });

  it('takes maximum HP when the Pokémon is hurt', () => {
    expect(readScreen('CP 600\n87 / 191 HP', normal).hp).toBe(191);
  });

  it('reads the cost from the line after POWER UP when OCR splits them', () => {
    expect(readScreen('POWER UP\n9,000 12', normal).dust).toBe(9000);
  });

  it('ignores the Stardust total even when it looks like a cost', () => {
    expect(readScreen('4000 87\nSTARDUST CANDY\nPOWER UP', normal).dust).toBeUndefined();
  });

  it('only accepts costs that exist for the chosen options', () => {
    const shadow = { variant: 'shadow', lucky: false } as const;
    const lucky = { variant: 'normal', lucky: true } as const;
    expect(readScreen('POWER UP 14,400 24', shadow).dust).toBe(14400);
    expect(readScreen('POWER UP 14,400 24', normal).dust).toBeUndefined();
    expect(readScreen('POWER UP 7,500 20', lucky).dust).toBe(7500);
  });

  it('returns nothing for text that is not the Pokémon screen', () => {
    expect(readScreen('Settings\nVersion 0.321.0', normal)).toEqual({});
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

describe('readScreen CP misreads', () => {
  it('accepts the small CP letters read as "cpr" or "cr"', () => {
    expect(['cpr545', 'cr370', 'cp546'].map((t) => readScreen(t, normal).cp)).toEqual([545, 370, 546]);
  });
});

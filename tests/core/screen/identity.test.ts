import { describe, expect, it } from 'vitest';
import { readFamily, readName } from '../../../src/core/screen/identity';

const lines = (text: string) => text.split('\n');

describe('readName', () => {
  it('takes the species from the appraisal footer', () => {
    expect(readName(lines('Its attack is great\nThis Snorlax was caught on 1/2/2026'))).toBe('Snorlax');
  });

  it('takes the name over the HP line on the Pokémon screen, without junk', () => {
    expect(readName(lines('CP1499\n© Azumarill ¢\n191 / 191 HP'))).toBe('Azumarill');
  });

  it('keeps names with spaces and punctuation', () => {
    expect(readName(lines("Mr. Mime\n80 / 80 HP"))).toBe('Mr. Mime');
    expect(readName(lines("This Farfetch'd was caught on 1/2/2026"))).toBe("Farfetch'd");
  });

  it('ignores a scrap of junk over the HP line', () => {
    expect(readName(lines('LJ\n90 / 90 HP'))).toBeUndefined();
  });

  it('says nothing when neither is on screen', () => {
    expect(readName(lines('POWER UP 9,000 12'))).toBeUndefined();
  });
});

describe('readFamily', () => {
  it('reads the Candy name, which names the family', () => {
    expect(readFamily(lines('123,456 87\nSTARDUST ARON CANDY'))).toBe('ARON');
    expect(readFamily(lines('EXEGGCUTE CANDY'))).toBe('EXEGGCUTE');
  });

  it('ignores XL and Rare Candy', () => {
    expect(readFamily(lines('RARE CANDY\nCANDY XL\nXL CANDY\nSTARDUST CANDY CANDY'))).toBeUndefined();
  });
});

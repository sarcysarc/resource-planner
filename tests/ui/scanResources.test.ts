// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { fillResources } from '../../src/ui/scanResources';

const value = (name: string) => document.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value;
const values = () => ['stardust', 'candy', 'xl'].map(value);

describe('fillResources', () => {
  beforeEach(() => {
    const names = ['stardust', 'candy', 'xl', 'rareCandy', 'rareXl', 'trainerLevel'];
    document.body.innerHTML = `<fieldset>${names.map((n) => `<input name="${n}" />`).join('')}</fieldset>`;
  });

  const fill = (totals: Parameters<typeof fillResources>[1], sameFamily = true) =>
    fillResources(document.querySelector('fieldset')!, totals, sameFamily);

  it('fills the totals the screen showed and says what it filled', () => {
    expect(fill({ stardust: 123456, candy: 9, xl: 0 })).toBe('Your totals: 123,456 Stardust, 9 Candy, 0 XL Candy.');
    expect(values()).toEqual(['123456', '9', '0']);
  });

  it('fills the bag and profile values whatever the family', () => {
    expect(fill({ rareCandy: 51, rareXl: 38, trainerLevel: 30 }, false)).toBe('Your totals: 51 Rare Candy, 38 Rare Candy XL, trainer level 30.');
    expect(['rareCandy', 'rareXl', 'trainerLevel'].map(value)).toEqual(['51', '38', '30']);
  });

  it('keeps Candy out when it belongs to another family', () => {
    expect(fill({ stardust: 123456, candy: 9, xl: 4 }, false)).toBe('Your totals: 123,456 Stardust.');
    expect(values()).toEqual(['123456', '', '']);
  });

  it('asks for the Candy when the screen hid it', () => {
    expect(fill({ stardust: 123456 })).toBe(
      'Your totals: 123,456 Stardust. Candy not visible. Add a screenshot of the Pokémon screen, or type it.',
    );
  });

  it('does not ask for Candy that is already filled in', () => {
    document.querySelector<HTMLInputElement>('[name="candy"]')!.value = '30';
    expect(fill({ stardust: 123456 })).toBe('Your totals: 123,456 Stardust.');
  });

  it('says nothing when no totals were read', () => {
    expect(fill({})).toBe('');
    expect(values()).toEqual(['', '', '']);
  });
});

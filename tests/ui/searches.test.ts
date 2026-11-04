import { describe, expect, it } from 'vitest';
import { searchName, suggestSearches } from '../../src/ui/searches';
import { findSpecies, loadBundledIndex } from '../../src/ui/species';

const index = loadBundledIndex();
const nameFor = (name: string) => searchName(index, findSpecies(index, name)!);

describe('searchName', () => {
  it('uses the lower-case species name', () => {
    expect(nameFor('Jolteon')).toBe('jolteon');
  });

  it('drops the form, which the game search cannot tell apart', () => {
    expect(nameFor('Raichu (Alolan)')).toBe('raichu');
    expect(nameFor('Farfetch\'d (Galarian)')).toBe('farfetch\'d');
  });

  it('keeps punctuation the game needs', () => {
    expect(nameFor('Mr. Mime')).toBe('mr. mime');
    expect(nameFor('Ho-Oh')).toBe('ho-oh');
  });

  it('uses the next stage when the name has a symbol that is hard to type', () => {
    expect(nameFor('Nidoran Female')).toBe('nidorina');
    expect(nameFor('Nidoran Male')).toBe('nidorino');
  });
});

describe('suggestSearches', () => {
  it('suggests the family, then narrower searches within it', () => {
    expect(suggestSearches('jolteon').map((s) => s.text)).toEqual([
      '+jolteon',
      '+jolteon&cp-1500',
      '+jolteon&cp-2500',
      '+jolteon&3*-',
      '+jolteon&!@3move',
      '+jolteon&shadow,purified',
    ]);
  });

  it('says what each search is for', () => {
    const [family, great] = suggestSearches('jolteon');
    expect(family!.purpose).toContain('whole family');
    expect(great!.purpose).toContain('Great League');
  });
});

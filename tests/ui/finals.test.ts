import { describe, expect, it } from 'vitest';
import { defaultTarget, finalsOf, lineFinals, targetChoices } from '../../src/ui/finals';
import { findSpecies, loadBundledIndex } from '../../src/ui/species';

const index = loadBundledIndex();
const sp = (name: string) => findSpecies(index, name)!;
const names = (list: { name: string }[]) => list.map((s) => s.name);

describe('final evolutions', () => {
  it('follows a line to its last stage', () => {
    expect(names(finalsOf(index, sp('Gastly')))).toEqual(['Gengar']);
    expect(names(finalsOf(index, sp('Gengar')))).toEqual(['Gengar']);
  });

  it('gives each final of a branching line', () => {
    expect(names(finalsOf(index, sp('Gloom')))).toEqual(['Vileplume', 'Bellossom']);
    expect(names(finalsOf(index, sp('Bellossom')))).toEqual(['Bellossom']);
  });

  it('takes the finals every Pokémon read can reach, else any of them', () => {
    expect(names(lineFinals(index, [sp('Gloom'), sp('Bellossom')]))).toEqual(['Bellossom']);
    expect(names(lineFinals(index, [sp('Vileplume'), sp('Bellossom')]))).toEqual(['Vileplume', 'Bellossom']);
  });
});

describe('a line’s target', () => {
  it('is the final evolution when there is one', () => {
    expect(defaultTarget(index, sp('Lairon'))).toBe('Aggron');
  });

  it('is the species read when its line branches', () => {
    expect(defaultTarget(index, sp('Gloom'))).toBe('Gloom');
  });

  it('is asked for when the line branches', () => {
    expect(targetChoices(index, [sp('Oddish')], '')).toEqual(['Vileplume', 'Bellossom']);
  });

  it('is not asked for when the line does not branch, or the target set fits', () => {
    expect(targetChoices(index, [sp('Lairon')], '')).toEqual([]);
    expect(targetChoices(index, [sp('Gloom')], 'Bellossom')).toEqual([]);
    expect(targetChoices(index, [], '')).toEqual([]);
  });

  it('is asked for again when a Pokémon read can’t become the target set', () => {
    expect(targetChoices(index, [sp('Eevee')], 'Pikachu')).toHaveLength(8);
  });
});

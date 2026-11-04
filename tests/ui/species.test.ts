import { describe, expect, it } from 'vitest';
import { buildIndex, evolutionLine, findSpecies, loadBundledIndex } from '../../src/ui/species';

describe('species index', () => {
  const index = loadBundledIndex();

  it('loads the bundled data', () => {
    expect(index.all.length).toBeGreaterThan(500);
    expect(findSpecies(index, 'azumarill')?.base).toEqual({ atk: 112, def: 152, hp: 225 });
  });

  it('finds species case-insensitively by name or id', () => {
    expect(findSpecies(index, '  Azumarill ')?.id).toBe('azumarill');
    expect(findSpecies(index, 'not a pokemon')).toBeUndefined();
  });

  it('lists the evolution line from the first stage to the target', () => {
    const azumarill = findSpecies(index, 'Azumarill')!;
    expect(evolutionLine(index, azumarill).map((s) => s.id)).toEqual(['azurill', 'marill', 'azumarill']);
  });

  it('rejects malformed data', () => {
    expect(() => buildIndex({ species: [{ id: 1 }] })).toThrow();
  });
});

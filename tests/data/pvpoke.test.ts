import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, SpeciesFileSchema, toSpeciesFile } from '../../src/data/pvpoke';

const SOURCE = 'https://example.test/gamemaster.json';

function entry(over: Record<string, unknown> = {}) {
  return {
    dex: 1, speciesId: 'sprout', speciesName: 'Sprout', baseStats: { atk: 100, def: 90, hp: 120 },
    types: ['grass', 'none'], thirdMoveCost: 10000, released: true, tags: [],
    family: { id: 'FAMILY_SPROUT', evolutions: ['bloom'] }, ...over,
  };
}

function gameMaster(pokemon: unknown[]) {
  return { timestamp: '2026-01-01 00:00:00', pokemon };
}

describe('toSpeciesFile', () => {
  it('keeps the fields the app uses, with types and the schema version', () => {
    const file = toSpeciesFile(gameMaster([entry()]), SOURCE);
    expect(file).toEqual({
      schemaVersion: SCHEMA_VERSION, source: SOURCE, timestamp: '2026-01-01 00:00:00',
      species: [{
        id: 'sprout', name: 'Sprout', dex: 1, base: { atk: 100, def: 90, hp: 120 },
        types: ['grass'], family: 'FAMILY_SPROUT', parent: null, secondMoveDust: 10000,
      }],
    });
  });

  it('reads the parent and a missing second move', () => {
    const child = entry({ speciesId: 'bloom', family: { id: 'FAMILY_SPROUT', parent: 'sprout' }, thirdMoveCost: false });
    const [bloom] = toSpeciesFile(gameMaster([child]), SOURCE).species;
    expect(bloom).toMatchObject({ parent: 'sprout', secondMoveDust: null });
  });

  it('falls back to the species id when there is no family', () => {
    const [loner] = toSpeciesFile(gameMaster([entry({ family: undefined })]), SOURCE).species;
    expect(loner?.family).toBe('sprout');
  });

  it('drops Shadow, Mega and unreleased entries', () => {
    const pokemon = [entry({ tags: ['shadow'] }), entry({ tags: ['mega'] }), entry({ released: false }), entry()];
    expect(toSpeciesFile(gameMaster(pokemon), SOURCE).species).toHaveLength(1);
  });

  it('rejects a game master that is not the expected shape', () => {
    expect(() => toSpeciesFile({ pokemon: 'none' }, SOURCE)).toThrow();
    expect(() => toSpeciesFile(gameMaster([entry({ baseStats: null })]), SOURCE)).toThrow();
  });
});

describe('SpeciesFileSchema', () => {
  it('rejects a file from another schema version', () => {
    const file = toSpeciesFile(gameMaster([entry()]), SOURCE);
    expect(SpeciesFileSchema.safeParse({ ...file, schemaVersion: SCHEMA_VERSION - 1 }).success).toBe(false);
  });
});

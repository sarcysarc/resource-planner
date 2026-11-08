import { describe, expect, it } from 'vitest';
import { EVOLVE_SCHEMA_VERSION, EvolveFileSchema, toEvolveFile } from '../../src/data/evolve';

const SOURCE = 'https://example.test/pve.json';

// PokeMiners' templates, cut down. The Alolan Rattata's 50 is made up, so the form's own
// template can be told apart from the plain one's.
function template(templateId: string, settings: Record<string, unknown>) {
  const pokemonId = /^V\d{4}_POKEMON_([A-Z]+)/.exec(templateId)![1];
  return { templateId, data: { templateId, pokemonSettings: { pokemonId, ...settings } } };
}
const branch = (evolution: string, candyCost?: number, form?: string) => ({ evolution, candyCost, form });

const pve = [
  template('V0019_POKEMON_RATTATA', { evolutionBranch: [branch('RATICATE', 25)] }),
  template('V0019_POKEMON_RATTATA_ALOLA', { form: 'RATTATA_ALOLA', evolutionBranch: [branch('RATICATE', 50, 'RATICATE_ALOLA')] }),
  template('V0020_POKEMON_RATICATE', {}),
  // A Mega Evolution's branch names no species.
  template('V0025_POKEMON_PIKACHU', { evolutionBranch: [branch('RAICHU', 50), { temporaryEvolution: 'TEMP_EVOLUTION_MEGA' }] }),
  template('V0026_POKEMON_RAICHU', {}),
  template('V0123_POKEMON_SCYTHER', { evolutionBranch: [branch('SCIZOR', 50, 'SCIZOR_NORMAL')] }),
  template('V0212_POKEMON_SCIZOR', {}),
  template('V0263_POKEMON_ZIGZAGOON', { evolutionBranch: [branch('LINOONE', 50, 'LINOONE_NORMAL')] }),
  template('V0263_POKEMON_ZIGZAGOON_GALARIAN', { form: 'ZIGZAGOON_GALARIAN', evolutionBranch: [branch('LINOONE', 25, 'LINOONE_GALARIAN')] }),
  template('V0264_POKEMON_LINOONE', {}),
  template('V0854_POKEMON_SINISTEA', { evolutionBranch: [branch('POLTEAGEIST', 50, 'POLTEAGEIST_PHONY'), branch('POLTEAGEIST', 400, 'POLTEAGEIST_ANTIQUE')] }),
  template('V0855_POKEMON_POLTEAGEIST', {}),
  template('V0900_POKEMON_KLEAVOR', {}),
  // Deerling's plain template has no branch; each season's form has the same one.
  template('V0585_POKEMON_DEERLING', {}),
  template('V0585_POKEMON_DEERLING_SPRING', { form: 'DEERLING_SPRING', evolutionBranch: [branch('SAWSBUCK', 50, 'SAWSBUCK_SPRING')] }),
  template('V0585_POKEMON_DEERLING_WINTER', { form: 'DEERLING_WINTER', evolutionBranch: [branch('SAWSBUCK', 50, 'SAWSBUCK_WINTER')] }),
  template('V0586_POKEMON_SAWSBUCK', {}),
  template('V0999_POKEMON_GIMMIGHOUL', { evolutionBranch: [branch('GHOLDENGO')] }),
  template('V1000_POKEMON_GHOLDENGO', {}),
  { templateId: 'V0013_MOVE_WRAP', data: { templateId: 'V0013_MOVE_WRAP', moveSettings: { durationMs: 1 } } },
];

const species = [
  ['rattata', 19, null], ['raticate', 20, 'rattata'],
  ['rattata_alolan', 19, null], ['raticate_alolan', 20, 'rattata_alolan'],
  ['pikachu', 25, null], ['raichu', 26, 'pikachu'], ['raichu_alolan', 26, 'pikachu'],
  ['scyther', 123, null], ['scizor', 212, 'scyther'], ['kleavor', 900, 'scyther'],
  ['zigzagoon', 263, null], ['linoone', 264, 'zigzagoon'],
  ['zigzagoon_galarian', 263, null], ['linoone_galarian', 264, 'zigzagoon_galarian'],
  ['sinistea', 854, null], ['polteageist', 855, 'sinistea'],
  ['gimmighoul', 999, null], ['gholdengo', 1000, 'gimmighoul'],
  ['coalossal', 839, 'rolycoly'],
  ['deerling', 585, null], ['sawsbuck', 586, 'deerling'],
].map(([id, dex, parent]) => ({ id: id as string, dex: dex as number, parent: parent as string | null }));

describe('toEvolveFile', () => {
  const file = toEvolveFile({ species, pve, source: SOURCE });

  it('keeps the cost of evolving into each species, from its parent’s template', () => {
    expect(file.costs).toMatchObject({ raichu: 50, raichu_alolan: 50, raticate: 25, scizor: 50, linoone: 50 });
  });

  it('uses the template of the parent’s form, spelt as PokeMiners spells it', () => {
    expect([file.costs.linoone_galarian, file.costs.raticate_alolan]).toEqual([25, 50]);
  });

  it('uses the parent’s forms when its plain template has no branch', () => {
    expect(file.costs.sawsbuck).toBe(50);
  });

  it('leaves out what has no Candy cost, no branch, two costs or no parent', () => {
    for (const id of ['gholdengo', 'kleavor', 'polteageist', 'coalossal']) expect(file.costs).not.toHaveProperty(id);
  });

  it('writes a file the app can read', () => {
    expect(EvolveFileSchema.parse(file)).toEqual({ schemaVersion: EVOLVE_SCHEMA_VERSION, source: SOURCE, costs: file.costs });
  });
});

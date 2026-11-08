import { describe, expect, it } from 'vitest';
import { PURIFY_SCHEMA_VERSION, PurifyFileSchema, toPurifyFile } from '../../src/data/purify';

const SOURCE = 'https://example.test/pve.json';

// PokeMiners' templates, cut down. The Alolan Rattata's price is made up, so the form's
// own template can be told apart from the plain one's.
function template(templateId: string, settings: Record<string, unknown>) {
  const pokemonId = /^V\d{4}_POKEMON_([A-Z]+)/.exec(templateId)![1];
  return { templateId, data: { templateId, pokemonSettings: { pokemonId, ...settings } } };
}
const shadow = (stardust: number, candy: number) => ({ shadow: { purificationStardustNeeded: stardust, purificationCandyNeeded: candy } });

const pve = [
  template('V0006_POKEMON_CHARIZARD', shadow(3000, 3)),
  template('V0019_POKEMON_RATTATA', shadow(1000, 1)),
  template('V0019_POKEMON_RATTATA_ALOLA', { form: 'RATTATA_ALOLA', ...shadow(3000, 3) }),
  template('V0052_POKEMON_MEOWTH', shadow(3000, 3)),
  template('V0052_POKEMON_MEOWTH_GALARIAN', { form: 'MEOWTH_GALARIAN' }),
  template('V0151_POKEMON_MEW', {}),
  template('V0538_POKEMON_THROH', shadow(5000, 1)),
  { templateId: 'V0013_MOVE_WRAP', data: { templateId: 'V0013_MOVE_WRAP', moveSettings: { durationMs: 1 } } },
];

const species = [
  ['charizard', 6], ['rattata', 19], ['rattata_alolan', 19], ['meowth', 52], ['meowth_galarian', 52],
  ['mew', 151], ['throh', 538], ['missingno', 0],
].map(([id, dex]) => ({ id: id as string, dex: dex as number, parent: null }));

describe('toPurifyFile', () => {
  const file = toPurifyFile({ species, pve, source: SOURCE });

  it('keeps each species’ own purify price, not one guessed from its second move', () => {
    expect(file.costs).toMatchObject({ charizard: { stardust: 3000, candy: 3 }, throh: { stardust: 5000, candy: 1 } });
  });

  it('uses the form’s template, spelt as PokeMiners spells it', () => {
    expect([file.costs.rattata, file.costs.rattata_alolan]).toEqual([{ stardust: 1000, candy: 1 }, { stardust: 3000, candy: 3 }]);
  });

  it('falls back to the plain template when the form’s has no price', () => {
    expect(file.costs.meowth_galarian).toEqual({ stardust: 3000, candy: 3 });
  });

  it('leaves out species that cannot be Shadow or are not in the game master', () => {
    expect(file.costs).not.toHaveProperty('mew');
    expect(file.costs).not.toHaveProperty('missingno');
  });

  it('writes a file the app can read', () => {
    expect(PurifyFileSchema.parse(file)).toEqual({ schemaVersion: PURIFY_SCHEMA_VERSION, source: SOURCE, costs: file.costs });
  });
});

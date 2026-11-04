// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readCandidate, readResources } from '../../src/ui/form';
import { findSpecies, loadBundledIndex } from '../../src/ui/species';
import { cp } from '../../src/core/stats';

const index = loadBundledIndex();
const target = findSpecies(index, 'Azumarill')!;

function input(name: string, value: string | boolean): HTMLInputElement {
  const el = document.createElement('input');
  el.name = name;
  if (typeof value === 'boolean') {
    el.type = 'checkbox';
    el.checked = value;
  } else {
    el.value = value;
  }
  return el;
}

function fieldset(values: Record<string, string | boolean>): HTMLElement {
  const root = document.createElement('fieldset');
  Object.entries(values).forEach(([name, value]) => root.append(input(name, value)));
  return root;
}

const valid = {
  form: 'azumarill', atk: '4', def: '15', hp: '13', level: '20', cp: '', variant: 'normal',
  lucky: false, bestBuddy: false, secondMove: true, evolveCandy: '0',
};

describe('readCandidate', () => {
  it('builds a candidate from valid input', () => {
    const r = readCandidate({ root: fieldset(valid), index, target });
    expect(r.ok && r.value).toMatchObject({ level: 20, ivs: { atk: 4, def: 15, hp: 13 }, secondMoveDust: 50000 });
  });

  it('derives the level from CP using the current form', () => {
    const marill = findSpecies(index, 'Marill')!;
    const value = cp({ base: marill.base, ivs: { atk: 4, def: 15, hp: 13 }, level: 30 });
    const root = fieldset({ ...valid, form: 'marill', level: '', cp: String(value) });
    const r = readCandidate({ root, index, target });
    expect(r.ok && r.value.level).toBe(30);
    expect(r.ok && r.value.base).toEqual(target.base);
  });

  it('reports invalid IVs, missing level and impossible CP', () => {
    expect(readCandidate({ root: fieldset({ ...valid, atk: '16' }), index, target }).ok).toBe(false);
    expect(readCandidate({ root: fieldset({ ...valid, level: '' }), index, target })).toMatchObject({ ok: false });
    const r = readCandidate({ root: fieldset({ ...valid, level: '', cp: '99999' }), index, target });
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining('CP') });
  });

  it('says how to fill a blank IV rather than reporting NaN', () => {
    expect(readCandidate({ root: fieldset({ ...valid, atk: '' }), index, target })).toEqual({
      ok: false,
      error: 'Attack IV: enter 0 to 15, add an appraisal screenshot, or use Find IVs',
    });
  });

  it('asks for the evolve Candy when the form still has to evolve and it is blank', () => {
    const root = fieldset({ ...valid, form: 'marill', evolveCandy: '' });
    expect(readCandidate({ root, index, target })).toEqual({
      ok: false,
      error: 'Candy to evolve: type the total from Marill to Azumarill, or add a screenshot of each stage',
    });
  });

  it('takes a blank evolve Candy as none when the form is the target', () => {
    const r = readCandidate({ root: fieldset({ ...valid, evolveCandy: '' }), index, target });
    expect(r.ok && r.value.evolveCandy).toBe(0);
  });

  it('names a Pokémon from another line that a screenshot showed, rather than its CP', () => {
    const root = fieldset({ ...valid, level: '', cp: '1177' });
    const select = document.createElement('select');
    select.name = 'form';
    select.append(new Option('Azumarill', 'azumarill'));
    select.dataset.chosen = 'snorlax';
    root.querySelector('[name="form"]')!.replaceWith(select);
    expect(readCandidate({ root, index, target })).toEqual({
      ok: false,
      error: 'This is Snorlax, which does not evolve into Azumarill: compare two Pokémon from one evolution line',
    });
  });

  it('rejects a form outside the evolution line', () => {
    expect(readCandidate({ root: fieldset({ ...valid, form: 'pikachu' }), index, target }).ok).toBe(false);
  });
});

describe('readResources', () => {
  it('treats blanks as unlimited', () => {
    const r = readResources(fieldset({ stardust: '100000', candy: '', xl: '20' }));
    expect(r).toEqual({ ok: true, value: { stardust: 100000, candy: Infinity, xl: 20 } });
  });
});

describe('readResources errors', () => {
  it('rejects negative amounts', () => {
    expect(readResources(fieldset({ stardust: '-5', candy: '', xl: '' })).ok).toBe(false);
  });
});

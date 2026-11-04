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

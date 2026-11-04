// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { battleStats, cp } from '../../src/core/stats';
import { buildCandidateFields } from '../../src/ui/candidateFields';
import { wireFinder } from '../../src/ui/finder';
import { loadBundledIndex } from '../../src/ui/species';

const azumarill = { atk: 112, def: 152, hp: 225 };
let root: HTMLFieldSetElement;

function set(name: string, value: string): void {
  root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!.value = value;
}

function find(): HTMLElement {
  root.querySelector<HTMLButtonElement>('[data-find]')!.click();
  return root.querySelector<HTMLElement>('.matches')!;
}

function showPerfect(): void {
  const spread = { base: azumarill, ivs: { atk: 15, def: 15, hp: 15 }, level: 30 };
  set('cp', String(cp(spread)));
  set('seenHp', String(battleStats(spread).hp));
}

describe('wireFinder', () => {
  beforeEach(() => {
    document.body.innerHTML = '<fieldset data-legend="Current"></fieldset>';
    root = document.querySelector('fieldset')!;
    buildCandidateFields(root);
    root.querySelector('select[name="form"]')!.append(new Option('Azumarill', 'azumarill'));
    wireFinder({ root, index: loadBundledIndex() });
  });

  it('lists the one spread that fits a full appraisal', () => {
    showPerfect();
    set('stars', '4');
    const buttons = find().querySelectorAll('button');
    expect([...buttons].map((b) => b.textContent)).toEqual(['15/15/15 · Lv 30']);
  });

  it('fills the IVs and level when a spread is picked', () => {
    showPerfect();
    set('stars', '4');
    find().querySelector('button')!.click();
    const values = ['atk', 'def', 'hp', 'level'].map((n) => root.querySelector<HTMLInputElement>(`[name="${n}"]`)!.value);
    expect(values).toEqual(['15', '15', '15', '30']);
    expect(root.querySelector('.matches')!.textContent).toContain('Filled in');
  });

  it('caps a long list and suggests how to narrow it', () => {
    set('cp', '1500');
    const matches = find();
    expect(matches.querySelectorAll('button').length).toBe(12);
    expect(matches.textContent).toContain('narrow');
  });

  it('says when nothing fits', () => {
    set('cp', '99999');
    expect(find().textContent).toContain('No IV spread fits');
  });

  it('asks for the CP', () => {
    expect(find().textContent).toContain('CP');
  });

  it('asks for the form first', () => {
    root.querySelector('select[name="form"]')!.replaceChildren();
    set('cp', '1500');
    expect(find().textContent).toContain('Pick');
  });
});

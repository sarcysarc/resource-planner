// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { buildCandidateFields } from '../../src/ui/candidateFields';

const FIELD_NAMES = ['form', 'atk', 'def', 'hp', 'level', 'cp', 'variant', 'lucky', 'bestBuddy', 'secondMove', 'evolveCandy',
  'screenshot', 'seenHp', 'dust', 'stars', 'atkBar', 'defBar', 'hpBar'];

function names(root: ParentNode): string[] {
  return [...root.querySelectorAll<HTMLInputElement>('[name]')].map((el) => el.name);
}

describe('buildCandidateFields', () => {
  let fieldset: HTMLFieldSetElement;

  beforeEach(() => {
    document.body.innerHTML = '<fieldset data-candidate="current" data-legend="Current Pokémon"></fieldset>';
    fieldset = document.querySelector('fieldset')!;
    buildCandidateFields(fieldset);
  });

  it('adds every candidate field once, in order', () => {
    expect(names(fieldset)).toEqual(FIELD_NAMES);
  });

  it('uses the data-legend text as the legend', () => {
    expect(fieldset.querySelector('legend')!.textContent).toBe('Current Pokémon');
  });

  it('treats the legend as text, not markup', () => {
    fieldset.dataset.legend = '<b>x</b>';
    buildCandidateFields(fieldset);
    expect(fieldset.querySelector('b')).toBeNull();
  });

  it('replaces earlier contents when built again', () => {
    buildCandidateFields(fieldset);
    expect(names(fieldset)).toEqual(FIELD_NAMES);
  });

  it('defaults evolve Candy to 0 and type to normal', () => {
    expect(fieldset.querySelector<HTMLInputElement>('[name="evolveCandy"]')!.value).toBe('0');
    expect(fieldset.querySelector<HTMLSelectElement>('[name="variant"]')!.value).toBe('normal');
  });
});

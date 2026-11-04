// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { buildCandidateFields } from '../../src/ui/candidateFields';

const FIELD_NAMES = ['screenshot', 'form', 'atk', 'def', 'hp', 'level', 'cp', 'variant', 'lucky', 'bestBuddy', 'secondMove', 'evolveCandy',
  'fastMove', 'chargedMove', 'pvpFastMove', 'seenHp', 'dust', 'stars', 'atkBar', 'defBar', 'hpBar'];

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

  it('leaves evolve Candy blank, as not known yet, and type normal', () => {
    expect(fieldset.querySelector<HTMLInputElement>('[name="evolveCandy"]')!.value).toBe('');
    expect(fieldset.querySelector<HTMLSelectElement>('[name="variant"]')!.value).toBe('normal');
  });

  it('puts the attack choices in a closed, optional section', () => {
    const moves = fieldset.querySelector<HTMLDetailsElement>('details.moves')!;
    expect(moves.open).toBe(false);
    expect(moves.querySelector('summary')!.textContent).toBe('Choose its attacks (optional)');
    expect(names(moves)).toEqual(['fastMove', 'chargedMove', 'pvpFastMove']);
  });

  it('explains each game term in plain words', () => {
    const hint = (name: string) => fieldset.querySelector(`[data-hint="${name}"]`)?.textContent ?? '';
    expect(hint('ivs')).toContain('hidden scores from 0 to 15');
    expect(hint('level')).toContain('either one');
    expect(hint('variant')).toContain('purple');
    expect(hint('lucky')).toContain('half the Stardust');
    expect(hint('bestBuddy')).toContain('one level');
    expect(hint('secondMove')).toContain('second charged attack');
    expect(hint('evolveCandy')).toContain('Evolve button');
  });
});

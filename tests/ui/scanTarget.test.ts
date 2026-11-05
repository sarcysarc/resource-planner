// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { applySpecies } from '../../src/ui/scanTarget';
import { buildCandidateFields } from '../../src/ui/candidateFields';
import { evolutionLine, findSpecies, loadBundledIndex } from '../../src/ui/species';

const index = loadBundledIndex();
let target: HTMLInputElement;
let root: HTMLFieldSetElement;
const select = () => root.querySelector<HTMLSelectElement>('[name="form"]')!;
const status = () => root.querySelector('[data-scan-status]')!.textContent;

// Stands in for the app filling the form choices from the target.
function refresh(): void {
  const line = evolutionLine(index, findSpecies(index, target.value)!);
  select().replaceChildren(...line.map((s) => new Option(s.name, s.id)));
}

const apply = (reading: Parameters<typeof applySpecies>[1]) => applySpecies({ index, target, root, refresh }, reading);

describe('applySpecies', () => {
  beforeEach(() => {
    document.body.innerHTML = '<input id="target" /><fieldset></fieldset>';
    target = document.querySelector('input')!;
    root = document.querySelector('fieldset')!;
    buildCandidateFields(root);
    root.querySelector('[data-scan-status]')!.textContent = 'Read CP 600.';
  });

  it('sets an empty target to the final evolution and selects the species read as the form', () => {
    apply({ name: 'Lairon' });
    expect([target.value, select().value]).toEqual(['Aggron', 'lairon']);
  });

  it('sets an empty target to the species read when its line branches, to be asked in step 1', () => {
    apply({ name: 'Gloom' });
    expect([target.value, select().value]).toEqual(['Gloom', 'gloom']);
  });

  it('marks the form read as chosen, so a later target keeps it', () => {
    apply({ name: 'Aron' });
    expect(select().dataset.chosen).toBe('aron');
  });

  it('keeps the chosen target and selects the form read when it is in that line', () => {
    target.value = 'Aggron';
    refresh();
    apply({ name: 'Aron' });
    expect([target.value, select().value]).toEqual(['Aggron', 'aron']);
  });

  it('raises the target past a later evolution read, since none evolves backwards', () => {
    target.value = 'Aron';
    refresh();
    expect(apply({ name: 'Lairon' })).toBe(true);
    expect([target.value, select().value, status()]).toEqual(['Aggron', 'lairon', 'Read CP 600.']);
  });

  it('says so when the species is not in the target line', () => {
    target.value = 'Aggron';
    refresh();
    apply({ name: 'Snorlax' });
    expect(select().value).toBe('aron');
    expect(status()).toBe('Read CP 600. This is Snorlax, which does not evolve into Aggron.');
  });

  it('asks which family member it is when the screen cannot tell', () => {
    apply({ family: 'ARON' });
    expect(target.value).toBe('');
    expect(status()).toBe('Read CP 600. Which is it: Aron, Lairon or Aggron? Pick it as the target or the form.');
  });

  it('does nothing when no species was read', () => {
    expect(apply({ cp: 600 })).toBe(false);
    expect([target.value, status()]).toEqual(['', 'Read CP 600.']);
  });

  it('says whether the Pokémon shares the target Candy family', () => {
    expect(apply({ name: 'Lairon' })).toBe(true);
    expect(apply({ name: 'Snorlax' })).toBe(false);
    expect(apply({ family: 'ARON' })).toBe(true);
  });
});

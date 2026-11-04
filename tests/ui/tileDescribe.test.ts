// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { buildCandidateFields } from '../../src/ui/candidateFields';
import { describeTile, markKnown } from '../../src/ui/tileDescribe';

let root: HTMLElement;
const set = (name: string, value: string) => (root.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value = value);

function line(...names: string[]): void {
  const select = root.querySelector<HTMLSelectElement>('[name="form"]')!;
  select.replaceChildren(...names.map((n) => new Option(n, n.toLowerCase())));
}

describe('describeTile', () => {
  beforeEach(() => {
    document.body.innerHTML = '<fieldset></fieldset>';
    root = document.querySelector('fieldset')!;
    buildCandidateFields(root);
  });

  it('names a new tile and lists every gap', () => {
    expect(describeTile(root)).toEqual({
      title: 'New Pokémon, IVs not known',
      notes: [
        'Add its appraisal for the IVs.',
        'Normal and not Lucky are guesses. Add its Pokémon screen to check.',
        'Add its screen scrolled down, together with its top screen, for the second move (taken as locked).',
      ],
    });
  });

  it('titles it by form, CP and IVs, and asks for the Candy to evolve when it is not the target', () => {
    line('Dratini', 'Dragonair', 'Dragonite');
    root.querySelector<HTMLSelectElement>('[name="form"]')!.value = 'dragonair';
    ['cp', 'atk', 'def', 'hp'].forEach((n, i) => set(n, ['900', '15', '14', '13'][i]));
    markKnown(root, ['variant', 'lucky', 'secondMove']);
    expect(describeTile(root)).toEqual({
      title: 'Dragonair, CP 900, IVs 15/14/13',
      notes: ['Add its screen scrolled down, together with its top screen, for the Candy to evolve.'],
    });
    set('evolveCandy', '100');
    expect(describeTile(root).notes).toEqual([]);
  });

  it('asks for the next form once its own evolve Candy was read', () => {
    line('Aron', 'Lairon', 'Aggron');
    ['atk', 'def', 'hp'].forEach((n) => set(n, '15'));
    markKnown(root, ['variant', 'lucky', 'secondMove', 'evolveStep']);
    expect(describeTile(root).notes).toEqual(['Add a Lairon’s screen scrolled down for the Candy to evolve it, or type the total.']);
  });

  it('adds to what is known without repeats', () => {
    markKnown(root, ['lucky']);
    markKnown(root, ['lucky', 'variant']);
    expect(root.dataset.known).toBe('lucky,variant');
  });
});

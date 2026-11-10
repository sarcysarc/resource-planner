// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { buildCandidateFields } from '../../src/ui/candidateFields';
import { wireFormChoices } from '../../src/ui/formChoices';
import { loadBundledIndex } from '../../src/ui/species';

const index = loadBundledIndex();
let target: HTMLInputElement;
let area: HTMLElement;
const select = () => area.querySelector<HTMLSelectElement>('[name="form"]')!;
const setTarget = (name: string) => {
  target.value = name;
  target.dispatchEvent(new Event('change'));
};

describe('form choices', () => {
  beforeEach(() => {
    document.body.innerHTML = '<input id="target" /><div><fieldset data-candidate></fieldset></div>';
    target = document.querySelector('input')!;
    area = document.querySelector('div')!;
    buildCandidateFields(area.querySelector('fieldset')!);
    wireFormChoices({ target, area, index });
  });

  it('lists the target’s line and selects the target', () => {
    setTarget('Persian');
    expect([...select().options].map((o) => o.text)).toEqual(['Meowth', 'Persian']);
    expect(select().value).toBe('persian');
  });

  // Issue #11: an Alolan Meowth in Persian's line was titled "Persian".
  it('keeps a form read from outside the line, after the line, so it is named by what was read', () => {
    select().dataset.chosen = 'meowth_alolan';
    setTarget('Persian');
    expect([...select().options].map((o) => o.text)).toEqual(['Meowth', 'Persian', 'Meowth (Alolan)']);
    expect(select().value).toBe('meowth_alolan');
  });
});

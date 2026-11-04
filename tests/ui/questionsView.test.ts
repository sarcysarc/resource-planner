// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { askQuestions } from '../../src/ui/questionsView';
import type { Question } from '../../src/ui/questions';

const stage: Question = {
  group: 0, field: 'name', text: 'Pokémon 1 (CP 600): which one is it?',
  choices: [{ label: 'Dratini', value: '"Dratini"' }, { label: 'Dragonair', value: '"Dragonair"' }],
};
const ivs: Question = {
  group: 1, field: 'ivs', text: 'Pokémon 2 (CP 90): the screenshots disagree on IVs. Which is right?',
  choices: [{ label: '15/14/13', value: '{"atk":15}' }, { label: '14/14/13', value: '{"atk":14}' }],
};

describe('askQuestions', () => {
  it('asks each question with its choices and answers once Continue is tapped', async () => {
    const box = document.createElement('div');
    box.hidden = true;
    const answers = askQuestions(box, [stage, ivs]);
    expect(box.hidden).toBe(false);
    const selects = [...box.querySelectorAll('select')];
    expect([...box.querySelectorAll('label')].map((l) => l.firstChild!.textContent)).toEqual([stage.text, ivs.text]);
    expect([...selects[0].options].map((o) => o.text)).toEqual(['Dratini', 'Dragonair']);
    selects[0].value = '"Dragonair"';
    box.querySelector('button')!.click();
    expect(await answers).toEqual([[stage, '"Dragonair"'], [ivs, '{"atk":15}']]);
    expect([box.hidden, box.children.length]).toEqual([true, 0]);
  });
});

// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
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
  let box: HTMLDivElement;
  const selects = () => [...box.querySelectorAll('select')];
  const go = () => box.querySelector<HTMLButtonElement>('button.primary')!;

  beforeEach(() => {
    box = document.createElement('div');
    box.hidden = true;
    document.body.replaceChildren(box);
  });

  it('asks each question with its choices and answers once Continue is tapped', async () => {
    const answers = askQuestions(box, [stage, ivs]);
    expect(box.hidden).toBe(false);
    expect([...box.querySelectorAll('label')].map((l) => l.firstChild!.textContent)).toEqual([stage.text, ivs.text]);
    expect([...selects()[0].options].filter((o) => !o.disabled).map((o) => o.text)).toEqual(['Dratini', 'Dragonair']);
    selects()[0].value = '"Dragonair"';
    selects()[1].value = '{"atk":15}';
    go().click();
    expect(await answers).toEqual([[stage, '"Dragonair"'], [ivs, '{"atk":15}']]);
    expect([box.hidden, box.children.length]).toEqual([true, 0]);
  });

  // Issue #6: a preselected first choice looked answered, and nothing said step 2 waited.
  it('says the Pokémon wait on the questions, and preselects no answer', () => {
    void askQuestions(box, [stage]);
    expect(box.firstElementChild!.textContent).toBe('1 question before your Pokémon are shown:');
    expect(selects()[0].value).toBe('');
    void askQuestions(box, [stage, ivs]);
    expect(box.firstElementChild!.textContent).toBe('2 questions before your Pokémon are shown:');
  });

  it('goes on only once every question is answered, pointing at the first left', () => {
    let settled = false;
    void askQuestions(box, [stage, ivs]).then(() => (settled = true));
    selects()[0].value = '"Dratini"';
    go().click();
    expect([box.hidden, document.activeElement]).toEqual([false, selects()[1]]);
    expect(box.querySelector('.field-error')!.textContent).toBe('Answer each question to go on.');
    expect(settled).toBe(false);
  });
});

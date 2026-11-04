// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { showError } from '../../src/ui/fieldError';

const PAGE = `
  <form>
    <section class="card" data-target-card><input id="target" /></section>
    <section class="card" data-grid-card></section>
    <fieldset data-tile="t1"><legend>Dratini, CP 500</legend><input name="atk" /></fieldset>
    <fieldset data-tile="t2"><legend>Dratini, CP 600</legend></fieldset>
    <fieldset data-resources><legend>Your resources</legend></fieldset>
    <p id="error"></p>
  </form>`;

const note = (selector: string) => document.querySelector(`${selector} .field-error`)?.textContent;

describe('showError', () => {
  let form: HTMLFormElement;
  beforeEach(() => {
    document.body.innerHTML = PAGE;
    form = document.querySelector('form')!;
  });

  it('shows the message by the button and on the Pokémon it is about', () => {
    const part = document.querySelector<HTMLElement>('[data-tile="t1"]')!;
    showError(form, 'Dratini, CP 500: Attack IV must be 0 to 15', { part, prefix: 'Dratini, CP 500: ' });
    expect(document.querySelector('#error')!.textContent).toBe('Dratini, CP 500: Attack IV must be 0 to 15');
    expect(note('[data-tile="t1"]')).toBe('Attack IV must be 0 to 15');
    expect(part.classList).toContain('invalid');
    expect(note('[data-tile="t2"]')).toBeUndefined();
  });

  it('finds the resources, the target and the grid by how the message starts', () => {
    showError(form, 'Resources: Stardust must be 0 or more');
    expect(note('[data-resources]')).toBe('Stardust must be 0 or more');
    showError(form, 'Pick the Pokémon you will battle with from the list');
    expect(note('[data-target-card]')).toBe('Pick the Pokémon you will battle with from the list');
    expect(note('[data-resources]')).toBeUndefined();
    showError(form, 'Add another Pokémon to compare with');
    expect(note('[data-grid-card]')).toBe('Add another Pokémon to compare with');
  });

  it('puts the note right after the legend', () => {
    showError(form, 'Resources: Level is needed');
    const legend = document.querySelector('[data-resources] legend')!;
    expect(legend.nextElementSibling!.className).toBe('field-error');
  });

  it('clears every note when there is no error', () => {
    showError(form, 'Resources: Level is needed');
    showError(form, '');
    expect(document.querySelectorAll('.field-error, .invalid')).toHaveLength(0);
    expect(document.querySelector('#error')!.textContent).toBe('');
  });

  it('shows an error it cannot place only by the button', () => {
    showError(form, 'Something else went wrong');
    expect(document.querySelectorAll('.field-error')).toHaveLength(0);
    expect(document.querySelector('#error')!.textContent).toBe('Something else went wrong');
  });
});

// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { showError } from '../../src/ui/fieldError';

const PAGE = `
  <form>
    <section class="card" data-target-card><input id="target" /></section>
    <fieldset data-candidate="current"><legend>Current Pokémon</legend><input name="atk" /></fieldset>
    <fieldset data-candidate="alternative"><legend>Alternative</legend></fieldset>
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

  it('shows the message by the button and beside the part it is about', () => {
    showError(form, 'Current: Attack IV must be 0 to 15');
    expect(document.querySelector('#error')!.textContent).toBe('Current: Attack IV must be 0 to 15');
    expect(note('[data-candidate="current"]')).toBe('Attack IV must be 0 to 15');
    expect(document.querySelector('[data-candidate="current"]')!.classList).toContain('invalid');
    expect(note('[data-candidate="alternative"]')).toBeUndefined();
  });

  it('finds the alternative, the resources and the target', () => {
    showError(form, 'Alternative: Level is needed');
    expect(note('[data-candidate="alternative"]')).toBe('Level is needed');
    showError(form, 'Resources: Stardust must be 0 or more');
    expect(note('[data-resources]')).toBe('Stardust must be 0 or more');
    expect(note('[data-candidate="alternative"]')).toBeUndefined();
    showError(form, 'Pick the Pokémon you will battle with from the list');
    expect(note('[data-target-card]')).toBe('Pick the Pokémon you will battle with from the list');
  });

  it('puts the note right after the legend', () => {
    showError(form, 'Current: Level is needed');
    const legend = document.querySelector('[data-candidate="current"] legend')!;
    expect(legend.nextElementSibling!.className).toBe('field-error');
  });

  it('clears every note when there is no error', () => {
    showError(form, 'Current: Level is needed');
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

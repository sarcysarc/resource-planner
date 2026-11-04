// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wordsOf } from '../core/screen/wordsOf';

// A made-up Pokémon screen, so no OCR runs.
vi.mock('../../src/ocr/recognize', () => ({
  readScreenshot: async () => ({ words: wordsOf('Lairon\n80 / 80 HP'), cpText: '600', digits: {} }),
}));

const { mountApp } = await import('../../src/ui/app');

function setField(selector: string, value: string): void {
  const el = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function submit(): void {
  document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
}

function fillSide(side: string, ivs: string[]): void {
  ['atk', 'def', 'hp'].forEach((n, i) => setField(`[data-candidate="${side}"] [name="${n}"]`, ivs[i]));
  setField(`[data-candidate="${side}"] [name="level"]`, '20');
}

describe('mountApp', () => {
  beforeEach(() => {
    const html = readFileSync('index.html', 'utf8');
    document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
    mountApp(document);
  });

  it('builds the same fields for both candidates', () => {
    const fieldNames = (side: string) =>
      [...document.querySelectorAll<HTMLInputElement>(`[data-candidate="${side}"] [name]`)].map((el) => el.name);
    expect(fieldNames('current').length).toBeGreaterThan(0);
    expect(fieldNames('alternative')).toEqual(fieldNames('current'));
  });

  it('takes the target and form from a screenshot', async () => {
    const input = document.querySelector<HTMLInputElement>('[data-candidate="current"] [name="screenshot"]')!;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'screen.png')] });
    input.dispatchEvent(new Event('change'));
    const form = document.querySelector<HTMLSelectElement>('[data-candidate="current"] select[name="form"]')!;
    await vi.waitFor(() => expect(form.value).toBe('lairon'));
    expect(document.querySelector<HTMLInputElement>('#target')!.value).toBe('Lairon');
  });

  it('fills the form choices from the target species', () => {
    setField('#target', 'Azumarill');
    const options = [...document.querySelectorAll('[data-candidate="current"] select[name="form"] option')];
    expect(options.map((o) => o.textContent)).toEqual(['Azurill', 'Marill', 'Azumarill']);
  });

  it('shows a comparison after submitting', () => {
    setField('#target', 'Azumarill');
    fillSide('current', ['15', '15', '15']);
    fillSide('alternative', ['4', '15', '13']);
    submit();
    expect(document.querySelector('#results')!.textContent).toContain('Great League');
    expect(document.querySelector('#error')!.textContent).toBe('');
  });

  it('shows an error for an unknown target', () => {
    setField('#target', 'Missingno');
    submit();
    expect(document.querySelector('#error')!.textContent).toContain('Pick');
  });

  it('shows an error when a candidate is incomplete', () => {
    setField('#target', 'Azumarill');
    submit();
    expect(document.querySelector('#error')!.textContent).toContain('Current');
  });
});

// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wordsOf } from '../core/screen/wordsOf';

// A made-up Pokémon screen, so no OCR runs.
vi.mock('../../src/ocr/recognize', () => ({
  readScreenshot: async () => ({
    words: wordsOf('Lairon\n80 / 80 HP\n123,456 9\nSTARDUST ARON CANDY'),
    cpText: '600',
    digits: { stardust: '123,456', candy: '9' },
  }),
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
    const resource = (name: string) => document.querySelector<HTMLInputElement>(`[data-resources] [name="${name}"]`)!.value;
    expect([resource('stardust'), resource('candy')]).toEqual(['123456', '9']);
    expect(document.querySelector('[data-searches] code')!.textContent).toBe('+lairon');
  });

  it('reads screenshots shared to the installed app', async () => {
    const shared = new Response(new File(['x'], 'a.png'), { headers: { 'content-type': 'image/png' } });
    const cache = { keys: async () => [new Request('https://example.test/shared/0')], match: async () => shared, delete: async () => true };
    vi.stubGlobal('caches', { open: async () => cache });
    window.history.replaceState(null, '', '/?shared=1');
    const html = readFileSync('index.html', 'utf8');
    document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
    mountApp(document);
    await vi.waitFor(() => expect(document.querySelector('[data-shots-status]')!.textContent).toBe('Read 1 screenshot: 1 Pokémon.'));
    vi.unstubAllGlobals();
  });

  it('suggests searches for a typed target', () => {
    setField('#target', 'Azumarill');
    expect(document.querySelector<HTMLElement>('[data-searches]')!.hidden).toBe(false);
  });

  it('fills Current from the shared screenshot picker', async () => {
    const input = document.querySelector<HTMLInputElement>('[data-shots] [name="screenshots"]')!;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.png'), new File(['x'], 'b.png')] });
    input.dispatchEvent(new Event('change'));
    const form = document.querySelector<HTMLSelectElement>('[data-candidate="current"] select[name="form"]')!;
    await vi.waitFor(() => expect(form.value).toBe('lairon'));
    expect(document.querySelector('[data-shots-status]')!.textContent).toBe('Read 2 screenshots: 1 Pokémon.');
    expect(document.querySelector('[data-candidate="current"] [name="cp"]')).toHaveProperty('value', '600');
  });

  it('fills the form choices from the target species', () => {
    setField('#target', 'Azumarill');
    const options = [...document.querySelectorAll('[data-candidate="current"] select[name="form"] option')];
    expect(options.map((o) => o.textContent)).toEqual(['Azurill', 'Marill', 'Azumarill']);
  });

  it('keeps a chosen form that is still in the line when the target evolves further', () => {
    setField('#target', 'Marill');
    setField('[data-candidate="current"] select[name="form"]', 'azurill');
    setField('#target', 'Azumarill');
    const form = (side: string) => document.querySelector<HTMLSelectElement>(`[data-candidate="${side}"] select[name="form"]`)!.value;
    expect([form('current'), form('alternative')]).toEqual(['azurill', 'azumarill']);
  });

  it('keeps the form a screenshot read when the target moves up its line', async () => {
    const input = document.querySelector<HTMLInputElement>('[data-candidate="current"] [name="screenshot"]')!;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'screen.png')] });
    input.dispatchEvent(new Event('change'));
    const form = document.querySelector<HTMLSelectElement>('[data-candidate="current"] select[name="form"]')!;
    await vi.waitFor(() => expect(form.value).toBe('lairon'));
    setField('#target', 'Aggron');
    expect(form.value).toBe('lairon');
  });

  it('shows a comparison after submitting', () => {
    setField('#target', 'Azumarill');
    fillSide('current', ['15', '15', '15']);
    fillSide('alternative', ['4', '15', '13']);
    submit();
    expect(document.querySelector('#results')!.textContent).toContain('Great League');
    expect(document.querySelector('#error')!.textContent).toBe('');
  });

  it('adds a purified column for a Shadow candidate', () => {
    setField('#target', 'Azumarill');
    fillSide('current', ['4', '15', '13']);
    setField('[data-candidate="current"] [name="variant"]', 'shadow');
    fillSide('alternative', ['15', '15', '15']);
    submit();
    const headings = [...document.querySelectorAll('#results thead th')].map((th) => th.textContent);
    expect(headings).toEqual(['Goal', 'Current', 'Current, purified', 'Alternative', 'Recommendation']);
    expect(document.querySelector('#results')!.textContent).toContain('Purify 3,000 Stardust · 3 Candy');
  });

  it('powers up no further than ten levels above the trainer', () => {
    setField('#target', 'Azumarill');
    fillSide('current', ['15', '15', '15']);
    fillSide('alternative', ['4', '15', '13']);
    setField('[name="trainerLevel"]', '25');
    submit();
    const results = document.querySelector('#results')!.textContent!;
    expect(results).toContain('Power up to Lv 35');
    expect(results).not.toContain('Lv 50');
  });

  it('shows an error for a trainer level out of range', () => {
    setField('#target', 'Azumarill');
    fillSide('current', ['15', '15', '15']);
    fillSide('alternative', ['4', '15', '13']);
    setField('[name="trainerLevel"]', '60');
    submit();
    expect(document.querySelector('#error')!.textContent).toContain('Trainer level');
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

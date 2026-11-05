// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wordsOf } from '../core/screen/wordsOf';

// Made-up Pokémon screens, so no OCR runs: a Lairon for every file.
vi.mock('../../src/ocr/recognize', () => ({
  openReader: async () => ({ close: async () => undefined, read: async () => ({ words: wordsOf('Lairon\n72 / 72 HP\n123,456 9\nSTARDUST ARON CANDY'), cpText: '600', digits: { stardust: '123,456', candy: '9' } }) }),
}));

const { mountApp } = await import('../../src/ui/app');

const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const tiles = () => [...document.querySelectorAll<HTMLElement>('[data-details] > [data-tile]')];
const tileOf = (root: HTMLElement) => q(`.tile[data-tile="${root.dataset.tile}"]`);
const field = (root: ParentNode, name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!;

function setField(el: HTMLInputElement | HTMLSelectElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillTile(root: HTMLElement, ivs: string[]): void {
  ['atk', 'def', 'hp'].forEach((n, i) => setField(field(root, n), ivs[i]));
  setField(field(root, 'level'), '20');
}

function twoByHand(): HTMLElement[] {
  q('[data-step-skip]').click();
  return tiles();
}

function submit(): void {
  q('form').dispatchEvent(new Event('submit', { cancelable: true }));
}

function choose(count: number | string[]): void {
  const names = typeof count === 'number' ? Array.from({ length: count }, (_, i) => `${i}.png`) : count;
  const input = q<HTMLInputElement>('[data-shots] [name="screenshots"]');
  Object.defineProperty(input, 'files', { value: names.map((name) => new File([name], name)), configurable: true });
  input.dispatchEvent(new Event('change'));
}


function load(): void {
  const html = readFileSync('index.html', 'utf8');
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  mountApp(document);
}

function compareTwo(ivs: string[][]): HTMLElement[] {
  setField(q('#target'), 'Azumarill');
  const roots = twoByHand();
  roots.forEach((root, i) => fillTile(root, ivs[i]));
  return roots;
}

// jsdom has no scrolling; the results are scrolled into view after a comparison.
const scrolled = vi.fn();
Element.prototype.scrollIntoView = scrolled;

describe('mountApp', () => {
  beforeEach(load);

  it('puts each Pokémon from the screenshots into the grid, with the target and form', async () => {
    choose(2);
    await vi.waitFor(() => expect(q('[data-shots-status]').textContent).toBe('Read 2 screenshots: 1 Pokémon.'));
    expect(tiles()).toHaveLength(1);
    const [root] = tiles();
    expect([field(root, 'form').value, field(root, 'cp').value, q<HTMLInputElement>('#target').value]).toEqual(['lairon', '600', 'Aggron']);
    expect(tileOf(root).querySelector('[data-title]')!.textContent).toBe('Lairon, CP 600, IVs not known');
    const resource = (name: string) => field(q('[data-resources]'), name).value;
    expect([resource('stardust'), resource('candy')]).toEqual(['123456', '9']);
    expect(q('[data-searches] code').textContent).toBe('+aggron');
    expect(q('[data-step="check"]').hidden).toBe(false);
  });

  it('keeps the form a screenshot read when the target moves up its line', async () => {
    choose(1);
    await vi.waitFor(() => expect(tiles()).toHaveLength(1));
    setField(q('#target'), 'Aggron');
    expect(field(tiles()[0], 'form').value).toBe('lairon');
  });

  it('reads screenshots shared to the installed app', async () => {
    const shared = new Response(new File(['x'], 'a.png'), { headers: { 'content-type': 'image/png' } });
    const cache = { keys: async () => [new Request('https://example.test/shared/0')], match: async () => shared, delete: async () => true };
    vi.stubGlobal('caches', { open: async () => cache });
    window.history.replaceState(null, '', '/?shared=1');
    load();
    await vi.waitFor(() => expect(q('[data-shots-status]').textContent).toBe('Read 1 screenshot: 1 Pokémon.'));
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('suggests searches for a typed target', () => {
    setField(q('#target'), 'Azumarill');
    expect(q('[data-searches]').hidden).toBe(false);
  });

  it('starts with two Pokémon to type in, and adds more by hand', () => {
    expect(twoByHand()).toHaveLength(2);
    expect(q('[data-step="check"]').hidden).toBe(false);
    q('[data-add-tile]').click();
    expect(tiles()).toHaveLength(3);
    expect(tiles().map((r) => r.hidden)).toEqual([true, true, false]);
  });

  it('fills every form list from the target and keeps a chosen form in the line', () => {
    const [a, b] = twoByHand();
    setField(q('#target'), 'Marill');
    expect([...field(a, 'form').querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Azurill', 'Marill']);
    setField(field(a, 'form'), 'azurill');
    setField(q('#target'), 'Azumarill');
    expect([field(a, 'form').value, field(b, 'form').value]).toEqual(['azurill', 'azumarill']);
  });

  it('ranks the Pokémon and suggests transferring one that is never the best', () => {
    const [a, b] = compareTwo([['15', '15', '15'], ['0', '0', '0']]);
    submit();
    expect(q('#results').textContent).toContain('Great League');
    expect(q('#error').textContent).toBe('');
    expect(scrolled).toHaveBeenCalled();
    expect(q('.ranked')).not.toBeNull();
    expect(tileOf(b).querySelector<HTMLElement>('[data-could]')!.hidden).toBe(false);
    expect(tileOf(a).querySelector<HTMLElement>('[data-could]')!.hidden).toBe(true);
  });

  it('leaves out a Pokémon marked for transfer and lists it', () => {
    const [, b] = compareTwo([['15', '13', '15'], ['15', '14', '15']]);
    q('[data-add-tile]').click();
    fillTile(tiles()[2], ['15', '15', '15']);
    const mark = tileOf(b).querySelector<HTMLInputElement>('[data-transfer]')!;
    mark.checked = true;
    mark.dispatchEvent(new Event('change', { bubbles: true }));
    submit();
    expect(q('#error').textContent).toBe('');
    expect(q('[data-transfers]').hidden).toBe(false);
    expect(q('[data-transfers] li').textContent).toBe('Azumarill, level 20, IVs 15/14/15');
    expect(q('#results').textContent).not.toContain('IVs 15/14/15');
  });

  it('adds a purified option for a Shadow Pokémon', () => {
    const [a] = compareTwo([['4', '15', '13'], ['15', '15', '15']]);
    setField(field(a, 'variant'), 'shadow');
    submit();
    expect(q('#results').textContent).toContain('Current, purified');
    expect(q('#results').textContent).toContain('Purify 3,000 Stardust · 3 Candy');
  });

  it('powers up no further than ten levels above the trainer', () => {
    compareTwo([['15', '15', '15'], ['4', '15', '13']]);
    setField(field(q('[data-resources]'), 'trainerLevel'), '25');
    submit();
    expect(q('#results').textContent).toContain('Power up to level 35');
    expect(q('#results').textContent).not.toContain('level 50');
  });

  it('shows an error for a trainer level out of range', () => {
    compareTwo([['15', '15', '15'], ['4', '15', '13']]);
    setField(field(q('[data-resources]'), 'trainerLevel'), '60');
    submit();
    expect(q('#error').textContent).toContain('Trainer level');
  });

  it('shows an error for an unknown target', () => {
    setField(q('#target'), 'Missingno');
    submit();
    expect(q('#error').textContent).toContain('Pick');
    expect(q('[data-target-card] .field-error').textContent).toContain('Pick');
  });

  it('asks for another Pokémon when there is only one', () => {
    setField(q('#target'), 'Azumarill');
    q('[data-add-tile]').click();
    submit();
    expect(q('[data-grid-card] .field-error').textContent).toContain('Add another Pokémon');
  });

  it('shows an incomplete Pokémon’s error on it and opens it', () => {
    setField(q('#target'), 'Azumarill');
    const [a, b] = twoByHand();
    fillTile(a, ['15', '15', '15']);
    submit();
    expect(q('#error').textContent).toMatch(/^Azumarill, IVs not known: /);
    expect(b.querySelector('.field-error')).not.toBeNull();
    expect([a.hidden, b.hidden]).toEqual([true, false]);
  });
});

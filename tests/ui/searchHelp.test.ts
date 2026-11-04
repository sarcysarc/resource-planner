// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wireSearches } from '../../src/ui/searchHelp';
import { loadBundledIndex } from '../../src/ui/species';

const index = loadBundledIndex();
const help = () => document.querySelector<HTMLElement>('[data-searches]')!;
const texts = () => [...help().querySelectorAll('code')].map((c) => c.textContent);

function pick(name: string): void {
  const target = document.querySelector<HTMLInputElement>('#target')!;
  target.value = name;
  target.dispatchEvent(new Event('change'));
}

describe('wireSearches', () => {
  beforeEach(() => {
    const html = readFileSync('index.html', 'utf8');
    document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
    wireSearches({ target: document.querySelector('#target')!, root: help(), index });
  });

  it('stays hidden until a Pokémon is picked', () => {
    expect(help().hidden).toBe(true);
    pick('not a pokemon');
    expect(help().hidden).toBe(true);
  });

  it('lists searches for the picked family', () => {
    pick('Jolteon');
    expect(help().hidden).toBe(false);
    expect(texts()[0]).toBe('+jolteon');
    expect(texts()).toContain('+jolteon&cp-1500');
  });

  it('replaces the list when the target changes', () => {
    pick('Jolteon');
    pick('Dragonite');
    expect(texts()[0]).toBe('+dragonite');
    expect(texts().length).toBe(6);
  });

  it('copies a search to the clipboard', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    pick('Jolteon');
    help().querySelector<HTMLButtonElement>('button')!.click();
    expect(writeText).toHaveBeenCalledWith('+jolteon');
    await vi.waitFor(() => expect(help().querySelector('button')!.textContent).toBe('Copied'));
  });

  it('says when copying is not possible', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    pick('Jolteon');
    help().querySelector<HTMLButtonElement>('button')!.click();
    await vi.waitFor(() => expect(help().querySelector('button')!.textContent).toBe('Copy by hand'));
  });
});

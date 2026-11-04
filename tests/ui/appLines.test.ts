// Step 1 into step 2's lines (ADR 0017): a grid per line, and screenshots read again.
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wordsOf } from '../core/screen/wordsOf';

// Made-up Pokémon screens, so no OCR runs: a Gengar for files named so, else a Lairon. A file
// named "ivs-<cp>.png" is a Lairon appraised at 12/3/14 at that CP.
vi.mock('../../src/ocr/recognize', () => {
  const lairon = (cp: string) => ({ words: wordsOf('Lairon\n80 / 80 HP\n123,456 9\nSTARDUST ARON CANDY'), cpText: cp, digits: { stardust: '123,456', candy: '9' } });
  const gengar = { words: wordsOf('Gengar\n120 / 120 HP\n123,456 30\nSTARDUST GASTLY CANDY'), cpText: '2000', digits: { stardust: '123,456', candy: '30' } };
  const appraised = (name: string) => ({ ...lairon(name.slice(4, -4)), ivs: { atk: 12, def: 3, hp: 14 } });
  return {
    readScreenshot: async ({ name }: File) => (name.startsWith('gengar') ? gengar : name.startsWith('ivs-') ? appraised(name) : lairon('600')),
  };
});

const { mountApp } = await import('../../src/ui/app');

const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const tiles = () => [...document.querySelectorAll<HTMLElement>('[data-details] > [data-tile]')];
const tileOf = (root: HTMLElement) => q(`.tile[data-tile="${root.dataset.tile}"]`);
const field = (root: ParentNode, name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
const titles = () => tiles().map((root) => tileOf(root).querySelector('[data-title]')!.textContent);
const rows = () => [...document.querySelectorAll<HTMLButtonElement>('[data-lines] button')];

// Each file's bytes are its name, so files of the same name are the same screenshot.
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

Element.prototype.scrollIntoView = () => undefined;

describe('mountApp with lines', () => {
  beforeEach(load);

  // Cause D in the stress test: every Pokémon took the first line's name (ADR 0017).
  it('puts each line’s Pokémon in a grid of its own, listed in step 2 with the first read open', async () => {
    choose(['0.png', 'gengar.png', '1.png']);
    await vi.waitFor(() => expect(q('[data-shots-status]').textContent).toBe('Read 3 screenshots: 2 Pokémon.'));
    await vi.waitFor(() => expect(rows()).toHaveLength(2));
    // By Pokédex number: Gastly is #92, Aron #304.
    expect(rows().map((b) => [b.textContent, b.getAttribute('aria-current')])).toEqual([
      ['Gastly line · 1', null],
      ['Aron line · 1', 'true'],
    ]);
    expect([titles(), q<HTMLInputElement>('#target').value]).toEqual([['Lairon, CP 600, IVs not known'], 'Lairon']);
    rows()[0].click();
    expect([titles(), q<HTMLInputElement>('#target').value]).toEqual([['Gengar, CP 2000, IVs not known'], 'Gengar']);
    // Each line keeps its own Candy; the Stardust is the account's.
    expect(['candy', 'stardust'].map((n) => field(q('[data-resources]'), n).value)).toEqual(['30', '123456']);
    rows()[1].click();
    expect([titles(), field(q('[data-resources]'), 'candy').value]).toEqual([['Lairon, CP 600, IVs not known'], '9']);
  });

  it('skips screenshots already read, in any line', async () => {
    choose(['0.png', 'gengar.png']);
    await vi.waitFor(() => expect(rows()).toHaveLength(2));
    choose(['gengar.png', '0.png']);
    await vi.waitFor(() => expect(q('[data-shots-status]').textContent).toBe('Skipped 2 already added.'));
    expect(rows().map((b) => b.textContent)).toEqual(['Gastly line · 1', 'Aron line · 1']);
  });

  it('asks whether one read again at a higher CP was powered up, and updates its tile on a yes', async () => {
    choose(['ivs-600.png']);
    await vi.waitFor(() => expect(tiles()).toHaveLength(1));
    choose(['ivs-700.png']);
    const box = q('[data-questions]');
    await vi.waitFor(() => expect(box.textContent).toContain('Is Lairon CP 700 (12/3/14) your Lairon CP 600, powered up?'));
    box.querySelector('select')!.value = '600';
    box.querySelector('button')!.click();
    await vi.waitFor(() => expect(titles()).toEqual(['Lairon, CP 700, IVs 12/3/14']));
  });

  it('adds another tile when one read again at another CP is not the same', async () => {
    choose(['ivs-600.png']);
    await vi.waitFor(() => expect(tiles()).toHaveLength(1));
    choose(['ivs-700.png']);
    const box = q('[data-questions]');
    await vi.waitFor(() => expect(box.hidden).toBe(false));
    box.querySelector('select')!.value = 'null';
    box.querySelector('button')!.click();
    await vi.waitFor(() => expect(tiles()).toHaveLength(2));
  });

  it('lists no lines while there is only one', async () => {
    choose(2);
    await vi.waitFor(() => expect(tiles()).toHaveLength(1));
    expect(q('[data-lines]').hidden).toBe(true);
  });
});

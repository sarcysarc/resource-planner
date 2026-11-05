// Step 1 into step 2's lines (ADR 0017): a grid per line, and screenshots read again.
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wordsOf } from '../core/screen/wordsOf';

// Made-up Pokémon screens, so no OCR runs: a Gengar for files named so, else a Lairon. A file
// named "ivs-<cp>.png" is a Lairon appraised at 12/3/14 at that CP, "cp-<cp>.png" one not appraised, and
// "max-<cp>.png" one appraised at 15/15/15.
// Each Lairon shows its Evolve button, so the Candy to evolve to Aggron, the target, is read.
vi.mock('../../src/ocr/recognize', () => {
  const EVOLVE = String.fromCharCode(10) + 'EVOLVE 100';
  const lairon = (cp: string) => ({ words: wordsOf('Lairon\n80 / 80 HP\n123,456 9\nSTARDUST ARON CANDY' + EVOLVE), cpText: cp, digits: { stardust: '123,456', candy: '9' } });
  const gloom = { words: wordsOf('Gloom\n80 / 80 HP\n123,456 40\nSTARDUST ODDISH CANDY'), cpText: '700', digits: { stardust: '123,456', candy: '40' } };
  const gengar = { words: wordsOf('Gengar\n120 / 120 HP\n123,456 30\nSTARDUST GASTLY CANDY'), cpText: '2000', digits: { stardust: '123,456', candy: '30' } };
  const appraised = (name: string) => ({ ...lairon(name.slice(4, -4)), ivs: name.startsWith('max') ? { atk: 15, def: 15, hp: 15 } : { atk: 12, def: 3, hp: 14 } });
  return {
    openReader: async () => ({ close: async () => undefined, read: async ({ name }: File) => (name.startsWith('gloom') ? gloom : name.startsWith('gengar') ? gengar : /^(ivs|max)-/.test(name) ? appraised(name) : name.startsWith('cp-') ? lairon(name.slice(3, -4)) : lairon('600')) }),
  };
});

// These made-up screens keep one HP across powering up, which no real Pokémon does, so the CP
// check (tested in cpCheck.test.ts and the stress grid check) is left out here.
vi.mock('../../src/ui/cpCheck', () => ({ checkCp: (_index: unknown, reading: unknown) => reading }));

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
      ['Gastly line · 1 · add another to compare', null],
      ['Aron line · 1 · add another to compare', 'true'],
    ]);
    expect([titles(), q<HTMLInputElement>('#target').value]).toEqual([['Lairon, CP 600, IVs not known'], 'Aggron']);
    rows()[0].click();
    expect([titles(), q<HTMLInputElement>('#target').value]).toEqual([['Gengar, CP 2000, IVs not known'], 'Gengar']);
    // Each line keeps its own Candy; the Stardust is the account's.
    expect(['candy', 'stardust'].map((n) => field(q('[data-resources]'), n).value)).toEqual(['30', '123456']);
    rows()[1].click();
    expect([titles(), field(q('[data-resources]'), 'candy').value]).toEqual([['Lairon, CP 600, IVs not known'], '9']);
  });

  it('asks in step 1 which final a branching line battles with, and makes it the target', async () => {
    choose(['gloom.png']);
    const box = q('[data-questions]');
    await vi.waitFor(() => expect(box.textContent).toContain('Which will you battle with from Gloom’s line: Vileplume or Bellossom?'));
    box.querySelector('select')!.value = '"Bellossom"';
    box.querySelector('button')!.click();
    await vi.waitFor(() => expect(tiles()).toHaveLength(1));
    expect([q<HTMLInputElement>('#target').value, field(tiles()[0], 'form').value]).toEqual(['Bellossom', 'gloom']);
  });

  it('skips screenshots already read, in any line', async () => {
    choose(['0.png', 'gengar.png']);
    await vi.waitFor(() => expect(rows()).toHaveLength(2));
    choose(['gengar.png', '0.png']);
    await vi.waitFor(() => expect(q('[data-shots-status]').textContent).toBe('Skipped 2 already added.'));
    expect(rows()).toHaveLength(2);
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

  it('gives each line a call once a batch is read, and again on Compare', async () => {
    choose(['cp-600.png', 'cp-650.png', 'gengar.png']);
    await vi.waitFor(() => expect(rows().map((b) => b.textContent)).toEqual(['Gastly line · 1 · add another to compare', 'Aron line · 2 · needs IVs']));
    rows()[0].click();
    q('[data-add-tile]').click();
    q('form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(rows().map((b) => b.textContent)).toContain('Gastly line · 2 · needs IVs');
  });

  it('puts the line with the biggest gain first', async () => {
    choose(['gengar.png', 'ivs-1118.png', 'max-1468.png']);
    await vi.waitFor(() => expect(rows()).toHaveLength(2));
    expect(rows()[0].textContent).toMatch(/^Aron line · 2 · Lairon, CP 1468, IVs 15\/15\/15: \d+% stronger in /);
  });

  it('lists no lines while there is only one', async () => {
    choose(2);
    await vi.waitFor(() => expect(tiles()).toHaveLength(1));
    expect(q('[data-lines]').hidden).toBe(true);
  });

  it('clears the open line only, once the player confirms, and opens the top of the list', async () => {
    choose(['gengar.png', 'cp-600.png', 'cp-650.png']);
    await vi.waitFor(() => expect(rows()).toHaveLength(2));
    rows().find((b) => b.textContent!.startsWith('Aron'))!.click();
    const clear = q('[data-clear-line]');
    expect(clear.hidden).toBe(false);
    vi.stubGlobal('confirm', vi.fn(() => false));
    clear.click();
    expect(rows()).toHaveLength(2);
    vi.stubGlobal('confirm', vi.fn(() => true));
    clear.click();
    expect(confirm).toHaveBeenCalledWith('Remove the Aron line’s 2 Pokémon from the grid, and from this device?');
    expect([titles(), q<HTMLInputElement>('#target').value, clear.hidden]).toEqual([['Gengar, CP 2000, IVs not known'], 'Gengar', true]);
    vi.unstubAllGlobals();
  });

  it('reads a cleared line’s screenshots again', async () => {
    choose(['gengar.png', 'cp-600.png']);
    await vi.waitFor(() => expect(rows()).toHaveLength(2));
    rows().find((b) => b.textContent!.startsWith('Aron'))!.click();
    vi.stubGlobal('confirm', () => true);
    q('[data-clear-line]').click();
    vi.unstubAllGlobals();
    choose(['cp-600.png']);
    await vi.waitFor(() => expect(rows()).toHaveLength(2));
  });
});

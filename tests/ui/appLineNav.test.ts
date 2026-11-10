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
const field = (root: ParentNode, name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
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

const heading = () => q('[data-grid-card] h3').textContent;
const submit = () => q('form').dispatchEvent(new Event('submit', { cancelable: true }));

// Issue #9: which line is open, and how to get to the next.
describe('moving between lines', () => {
  beforeEach(load);

  it('names the open line above its Pokémon, and says to tap a line', async () => {
    choose(['0.png', 'gengar.png']);
    await vi.waitFor(() => expect(rows()).toHaveLength(2));
    expect([heading(), q('[data-lines-hint]').hidden]).toEqual(['Your Pokémon: Aron line', false]);
    rows()[0].click();
    expect(heading()).toBe('Your Pokémon: Gastly line');
  });

  it('opens the next line from below the results, and takes the player to its Pokémon', async () => {
    choose(['gengar.png', 'ivs-1118.png', 'max-1468.png']);
    await vi.waitFor(() => expect(rows()).toHaveLength(2));
    const next = q<HTMLButtonElement>('[data-next-line]');
    const scrolled = vi.spyOn(q('[data-grid-card]'), 'scrollIntoView');
    expect([next.hidden, next.textContent]).toEqual([false, 'Next: Aron line →']);
    next.click();
    expect([heading(), next.textContent, scrolled.mock.calls.length]).toEqual(['Your Pokémon: Aron line', 'Next: Gastly line →', 1]);
  });
});

// Issue #10: "needs details" said neither which Pokémon nor what was wrong until Compare.
describe('a Pokémon whose details stop the comparison', () => {
  beforeEach(load);

  const problemTile = () => q('.tile.problem');

  it('is named in the line’s row, and marked with its problem when the line opens', async () => {
    choose(['ivs-1118.png', 'max-9999.png', 'gengar.png']);
    const aron = () => rows().find((b) => b.textContent!.startsWith('Aron'))?.textContent;
    // The calls come after the rows, once the whole batch is read.
    await vi.waitFor(() => expect(aron()).toBe('Aron line · 2 · check Lairon, CP 9999, IVs 15/15/15: no level gives CP 9999 with those IVs'));
    expect(problemTile()?.querySelector('[data-problem]')?.textContent).toBe('No level gives CP 9999 with those IVs');
    rows().find((b) => b.textContent!.startsWith('Gastly'))!.click();
    expect(problemTile()).toBeNull();
    rows().find((b) => b.textContent!.startsWith('Aron'))!.click();
    expect(problemTile()?.querySelector('[data-title]')?.textContent).toBe('Lairon, CP 9999, IVs 15/15/15');
    expect(tiles().find((root) => !root.hidden)?.dataset.tile).toBe(problemTile()?.dataset.tile);
  });

  it('is unmarked once its details are changed', async () => {
    choose(['ivs-1118.png', 'max-9999.png']);
    await vi.waitFor(() => expect(problemTile()).not.toBeNull());
    const root = tiles().find((r) => !r.hidden)!;
    field(root, 'cp').dispatchEvent(new Event('change', { bubbles: true }));
    expect(problemTile()).toBeNull();
    submit();
    expect(problemTile()).not.toBeNull();
  });
});

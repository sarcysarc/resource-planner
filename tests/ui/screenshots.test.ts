// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reading, Scan } from '../../src/core/screen/types';
import { wordsOf } from '../core/screen/wordsOf';

// Made-up screens: the HP tells them apart, the text gives the name.
const screen = (name: string, hp: number): Scan => ({ words: wordsOf(`${name}\n${hp} / ${hp} HP`), cpText: '600', digits: {} });
const readScreenshot = vi.fn<(image: Blob) => Promise<Scan>>();
vi.mock('../../src/ocr/recognize', () => ({ readScreenshot }));

const { wireScreenshots } = await import('../../src/ui/screenshots');

const use = vi.fn();
const onDone = vi.fn();
const useAccount = vi.fn((totals: object) => `Your totals: ${JSON.stringify(totals)}.`);
const profile: Scan = { words: wordsOf('LEVEL\nTOTAL ACTIVITY'), cpText: '', digits: { trainerLevel: '30' } };
const status = () => document.querySelector('[data-shots-status]')!.textContent;
const questions = () => document.querySelector<HTMLElement>('[data-questions]')!;
const picks = (r: Reading) => r.name;
// Only "Dratini" could be more than one stage in these tests.
const stagesOf = (r: Reading) => (r.name === 'Dratini' ? [{ name: 'Dratini' }, { name: 'Dragonair' }] : [{ name: r.name ?? '' }]);
const named = () => use.mock.calls.map(([group, shot]) => [group.reading.name, group.shots, (shot as File | undefined)?.name]);

async function choose(screens: Scan[]): Promise<void> {
  screens.forEach((s) => readScreenshot.mockResolvedValueOnce(s));
  const input = document.querySelector<HTMLInputElement>('[name="screenshots"]')!;
  Object.defineProperty(input, 'files', { value: screens.map((_, i) => new File(['x'], `${i}.png`, { lastModified: i })), configurable: true });
  input.dispatchEvent(new Event('change'));
  await vi.waitFor(() => expect(status()).not.toContain('Reading'));
}

describe('wireScreenshots', () => {
  const wiring = () => ({ root: document.querySelector('[data-shots]')!, familyOf: picks, stagesOf, use, useAccount, onDone });

  beforeEach(() => {
    const html = readFileSync('index.html', 'utf8');
    document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
    use.mockClear();
    useAccount.mockClear();
    onDone.mockClear();
    wireScreenshots(wiring());
  });

  it('puts every Pokémon into the grid with a screenshot for its thumbnail', async () => {
    await choose([screen('Lairon', 80), screen('Aggron', 120), screen('Lairon', 80), screen('Aron', 50)]);
    expect(named()).toEqual([
      ['Lairon', 2, '0.png'],
      ['Aggron', 1, '1.png'],
      ['Aron', 1, '3.png'],
    ]);
    expect(status()).toBe('Read 4 screenshots: 3 Pokémon.');
    expect(questions().hidden).toBe(true);
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('asks which stage it is before going on, and uses the answer', async () => {
    await choose([screen('Dratini', 80), screen('Lairon', 50)]);
    expect(use).not.toHaveBeenCalled();
    expect(questions().hidden).toBe(false);
    expect(questions().textContent).toContain('Pokémon 1 (Dratini, CP 600): which one is it?');
    questions().querySelector('select')!.value = '"Dragonair"';
    questions().querySelector('button')!.click();
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(named().map(([name]) => name)).toEqual(['Dragonair', 'Lairon']);
  });

  it('keeps a profile screenshot out of the Pokémon and fills its trainer level', async () => {
    await choose([profile, screen('Lairon', 80)]);
    expect(named()).toEqual([['Lairon', 1, '1.png']]);
    expect(useAccount).toHaveBeenCalledWith({ trainerLevel: 30 });
    expect(status()).toBe('Read 2 screenshots: 1 Pokémon. Your totals: {"trainerLevel":30}.');
  });

  it('reads a bag or profile screenshot on its own', async () => {
    await choose([profile]);
    expect(use).not.toHaveBeenCalled();
    expect(status()).toBe('Read 1 screenshot. Your totals: {"trainerLevel":30}.');
  });

  it('reads files handed over by the page, like shared screenshots', async () => {
    const read = wireScreenshots(wiring());
    readScreenshot.mockResolvedValueOnce(screen('Lairon', 80));
    read([new File(['x'], 'shared.png')]);
    await vi.waitFor(() => expect(status()).toBe('Read 1 screenshot: 1 Pokémon.'));
    expect(named()).toEqual([['Lairon', 1, 'shared.png']]);
  });

  it('ignores an empty hand-over', () => {
    wireScreenshots(wiring())([]);
    expect(status()).toBe('');
  });

  it('says when no Pokémon was found', async () => {
    await choose([{ words: wordsOf('Settings'), cpText: '', digits: {} }]);
    expect(use).not.toHaveBeenCalled();
    expect(status()).toBe('No Pokémon found in these screenshots. Use the appraisal screen.');
    expect(useAccount).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('says when the images could not be read at all', async () => {
    readScreenshot.mockRejectedValueOnce(new Error('broken'));
    const input = document.querySelector<HTMLInputElement>('[name="screenshots"]')!;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.png')], configurable: true });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(status()).toContain('1 image could not be read.'));
  });
});

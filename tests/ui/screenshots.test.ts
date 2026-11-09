// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Group } from '../../src/core/screen/merge';
import type { Reading, Scan } from '../../src/core/screen/types';
import { wordsOf } from '../core/screen/wordsOf';

// Made-up screens: the HP tells them apart, the text gives the name.
const screen = (name: string, hp: number): Scan => ({ words: wordsOf(`${name}\n${hp} / ${hp} HP`), cpText: '600', digits: {} });
const readScreenshot = vi.fn<(image: Blob) => Promise<Scan>>();
vi.mock('../../src/ocr/recognize', () => ({ openReader: async () => ({ read: readScreenshot, close: async () => undefined }) }));

const { wireScreenshots } = await import('../../src/ui/screenshots');

// The grid remembers each Pokémon's screenshots by fingerprint.
const seen = new Set<string>();
const use = vi.fn((_group: unknown, _shot?: File, prints?: string[]) => prints?.forEach((p) => seen.add(p)));
const onDone = vi.fn();
const useAccount = vi.fn((totals: object) => `Your totals: ${JSON.stringify(totals)}.`);
const profile: Scan = { words: wordsOf('LEVEL\nTOTAL ACTIVITY'), cpText: '', digits: { trainerLevel: '30' } };
const status = () => document.querySelector('[data-shots-status]')!.textContent;
const questions = () => document.querySelector<HTMLElement>('[data-questions]')!;
const picks = (r: Reading) => r.name;
// Only "Dratini" could be more than one stage in these tests.
const stagesOf = (r: Reading) => (r.name === 'Dratini' ? [{ name: 'Dratini' }, { name: 'Dragonair' }] : [{ name: r.name ?? '' }]);
// Checks each screenshot's CP before sorting (fix C); as read, unless a test says otherwise.
const checkCp = vi.fn((r: Reading) => r);
const named = () => use.mock.calls.map(([group, shot]) => [(group as Group).reading.name, (group as Group).shots, shot?.name]);

// Each file's bytes are its name, so files of the same name are the same screenshot.
async function choose(screens: Scan[], names = screens.map((_, i) => `${i}.png`)): Promise<void> {
  screens.forEach((s) => readScreenshot.mockResolvedValueOnce(s));
  const input = document.querySelector<HTMLInputElement>('[name="screenshots"]')!;
  Object.defineProperty(input, 'files', { value: names.map((name, i) => new File([name], name, { lastModified: i })), configurable: true });
  input.dispatchEvent(new Event('change'));
  await vi.waitFor(() => expect(status()).not.toContain('Reading'));
}

describe('wireScreenshots', () => {
  const wiring = () => ({ root: document.querySelector('[data-shots]')!, familyOf: picks, stagesOf, use, useAccount, onDone, seen: () => seen, checkCp });

  beforeEach(() => {
    const html = readFileSync('index.html', 'utf8');
    document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
    use.mockClear();
    checkCp.mockReset().mockImplementation((r) => r);
    seen.clear();
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
    expect(status()).toBe('Read 4 screenshots: 3 Pokémon in 3 lines.');
    expect(questions().hidden).toBe(true);
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('sorts screenshots by the CP their check gives, keeping each thumbnail', async () => {
    checkCp.mockImplementation((r) => (r.cp === 600 ? { ...r, cp: 1600 } : r));
    await choose([screen('Lairon', 80), screen('Lairon', 80)]);
    const [group, shot] = use.mock.calls[0] as [Group, File];
    expect([group.reading.cp, group.shots, shot.name]).toEqual([1600, 2, '0.png']);
  });

  it('gives each Pokémon the fingerprints of its screenshots', async () => {
    await choose([screen('Lairon', 80), screen('Aggron', 120), screen('Lairon', 80)]);
    expect(use.mock.calls.map(([, , prints]) => prints?.length)).toEqual([2, 1]);
  });

  it('skips screenshots already read, without reading them again', async () => {
    await choose([screen('Lairon', 80), screen('Aggron', 120)]);
    await choose([screen('Aron', 50)], ['1.png', '0.png', 'new.png']);
    expect(status()).toBe('Read 1 screenshot: 1 Pokémon in 1 line. Skipped 2 already added.');
    expect(named().map(([name]) => name)).toEqual(['Lairon', 'Aggron', 'Aron']);
  });

  it('says so when every screenshot was read before', async () => {
    await choose([screen('Lairon', 80)]);
    onDone.mockClear();
    await choose([], ['0.png']);
    expect([status(), use.mock.calls.length, onDone.mock.calls.length]).toEqual(['Skipped 1 already added.', 1, 1]);
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

  it('asks whether a Pokémon at another CP is one already added, powered up', async () => {
    const tiles = [{ family: 'Lairon', ivs: '12/3/14', cp: 500, name: 'Lairon' }];
    const input = document.querySelector('[name="screenshots"]')!;
    input.replaceWith(input.cloneNode()); // only this wiring listens
    wireScreenshots({ ...wiring(), known: () => tiles });
    await choose([{ ...screen('Lairon', 80), ivs: { atk: 12, def: 3, hp: 14 } }], ['powered.png']);
    expect(questions().textContent).toContain('Is Lairon CP 600 (12/3/14) your Lairon CP 500, powered up?');
    questions().querySelector('select')!.value = '500';
    questions().querySelector('button')!.click();
    await vi.waitFor(() => expect(use).toHaveBeenCalled());
    expect((use.mock.calls[0][0] as Group).was).toBe(500);
  });

  it('keeps a profile screenshot out of the Pokémon and fills its trainer level', async () => {
    await choose([profile, screen('Lairon', 80)]);
    expect(named()).toEqual([['Lairon', 1, '1.png']]);
    expect(useAccount).toHaveBeenCalledWith({ trainerLevel: 30 });
    expect(status()).toBe('Read 2 screenshots: 1 Pokémon in 1 line. Your totals: {"trainerLevel":30}.');
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
    await vi.waitFor(() => expect(status()).toBe('Read 1 screenshot: 1 Pokémon in 1 line.'));
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

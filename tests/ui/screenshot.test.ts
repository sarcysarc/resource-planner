// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Scan } from '../../src/core/screen/types';
import { buildCandidateFields } from '../../src/ui/candidateFields';
import { wordsOf } from '../core/screen/wordsOf';

const scan = (text: string, extra: Partial<Scan> = {}): Scan => ({ words: wordsOf(text), cpText: '', digits: {}, ...extra });
const POKEMON_SCREEN = scan('CP1499\n191 / 191 HP\nPOWER UP 9,000 12');
const readScreenshot = vi.fn<(image: Blob) => Promise<Scan>>(async () => POKEMON_SCREEN);
vi.mock('../../src/ocr/recognize', () => ({ readScreenshot }));

const { wireScreenshot } = await import('../../src/ui/screenshot');

let root: HTMLFieldSetElement;
const onRead = vi.fn();
const checked = (name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!.checked;
const value = (name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value;
const status = () => root.querySelector('[data-scan-status]')!.textContent;

async function choose(file: File | File[] | null): Promise<void> {
  const input = root.querySelector<HTMLInputElement>('[name="screenshot"]')!;
  const files = file === null ? [] : [file].flat();
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change'));
  await vi.waitFor(() => expect(status()).not.toContain('Reading'));
}

describe('wireScreenshot', () => {
  beforeEach(() => {
    document.body.innerHTML = '<fieldset data-legend="Current"></fieldset>';
    root = document.querySelector('fieldset')!;
    buildCandidateFields(root);
    wireScreenshot(root, onRead);
  });

  it('fills CP, HP and Stardust from the screenshot', async () => {
    await choose(new File(['x'], 'screen.png'));
    expect([value('cp'), value('seenHp'), value('dust')]).toEqual(['1499', '191', '9000']);
    expect(status()).toContain('CP 1499, HP 191, Stardust 9000');
    expect(root.querySelector('details')!.open).toBe(true);
  });

  it('fills CP, HP and the IVs from an appraisal screenshot', async () => {
    readScreenshot.mockResolvedValueOnce(scan('cr 999\n85 / 85 HP', { cpText: '«615 ou.', ivs: { atk: 12, def: 12, hp: 15 } }));
    await choose(new File(['x'], 'appraisal.png'));
    expect(['cp', 'seenHp', 'atk', 'def', 'hp'].map(value)).toEqual(['615', '85', '12', '12', '15']);
    expect(status()).toBe('Read CP 615, HP 85, IVs 12/12/15. Check them.');
    expect(root.querySelector('details')!.open).toBe(false);
  });

  it('uses the Shadow and Lucky choices to judge the Stardust cost', async () => {
    root.querySelector<HTMLSelectElement>('[name="variant"]')!.value = 'shadow';
    await choose(new File(['x'], 'screen.png'));
    expect(value('dust')).toBe('');
  });

  it('fills Shadow or Purified, Lucky, the second move and the evolve cost when the screen shows them', async () => {
    const text = 'LUCKY POKEMON\n80 / 80 HP\nEVOLVE 50\nGYMS & RAIDS\nO Lick\nO Return\nO Thunder\nCAUGHT AFTER DEFEATING GRUNT';
    readScreenshot.mockResolvedValueOnce(scan(text, { cpText: '600' }));
    await choose(new File(['x'], 'screen.png'));
    expect([value('variant'), value('evolveCandy')]).toEqual(['purified', '50']);
    expect([checked('lucky'), checked('secondMove')]).toEqual([true, true]);
    expect(status()).toBe('Read CP 600, HP 80, Purified, Lucky, second move unlocked, 50 Candy to evolve. Check them, then tap Find IVs.');
  });

  it('unticks the second move when the screen shows it locked, and leaves unseen choices alone', async () => {
    root.querySelector<HTMLInputElement>('[name="secondMove"]')!.checked = true;
    root.querySelector<HTMLInputElement>('[name="lucky"]')!.checked = true;
    readScreenshot.mockResolvedValueOnce(scan('80 / 80 HP\nGYMS & RAIDS\nO Lick\nNEW ATTACK 50,000 50', { cpText: '600' }));
    await choose(new File(['x'], 'screen.png'));
    expect([checked('secondMove'), checked('lucky'), value('variant')]).toEqual([false, true, 'normal']);
    expect(status()).toContain('second move locked');
  });

  it('passes the reading on so the app can pick the species', async () => {
    await choose(new File(['x'], 'screen.png'));
    expect(onRead).toHaveBeenLastCalledWith(expect.objectContaining({ cp: 1499 }));
  });

  it('says when the screenshot has nothing it can read', async () => {
    readScreenshot.mockResolvedValueOnce(scan('Settings', { cpText: '1499' }));
    await choose(new File(['x'], 'other.png'));
    expect(value('cp')).toBe('');
    expect(status()).toContain('Could not find');
  });

  it('reports a failed read', async () => {
    readScreenshot.mockRejectedValueOnce(new Error('boom'));
    await choose(new File(['x'], 'broken.png'));
    expect(status()).toContain('Could not read');
  });

  it('takes several screenshots of the same Pokémon at once', async () => {
    expect(root.querySelector<HTMLInputElement>('[name="screenshot"]')!.multiple).toBe(true);
    readScreenshot.mockResolvedValueOnce(POKEMON_SCREEN);
    readScreenshot.mockResolvedValueOnce(scan('191 / 191 HP', { cpText: '1499', ivs: { atk: 1, def: 2, hp: 3 } }));
    await choose([new File(['x'], 'top.png'), new File(['x'], 'appraisal.png')]);
    expect(['cp', 'dust', 'atk', 'def', 'hp'].map(value)).toEqual(['1499', '9000', '1', '2', '3']);
    expect(status()).toContain('Read 2 screenshots');
  });

  it('asks when the screenshots disagree, and leaves that field alone', async () => {
    readScreenshot.mockResolvedValueOnce(POKEMON_SCREEN);
    readScreenshot.mockResolvedValueOnce(scan('CP1500\n191 / 191 HP'));
    await choose([new File(['x'], 'a.png'), new File(['x'], 'b.png')]);
    expect(value('cp')).toBe('');
    expect(status()).toContain('The screenshots disagree on CP: 1499 or 1500. Type the right one.');
  });

  it('reads them oldest first, so the newest total counts', async () => {
    const totals = (dust: string) => scan('191 / 191 HP\n9 9\nSTARDUST ARON CANDY', { cpText: '1499', digits: { stardust: dust } });
    readScreenshot.mockImplementation(async (image) => totals((image as File).name === 'new.png' ? '200' : '100'));
    await choose([new File(['x'], 'new.png', { lastModified: 2 }), new File(['x'], 'old.png', { lastModified: 1 })]);
    readScreenshot.mockImplementation(async () => POKEMON_SCREEN);
    expect(onRead).toHaveBeenLastCalledWith(expect.objectContaining({ totals: { stardust: 200 } }));
  });

  it('keeps what it could read when one of several images fails', async () => {
    readScreenshot.mockRejectedValueOnce(new Error('boom'));
    await choose([new File(['x'], 'broken.png'), new File(['x'], 'screen.png')]);
    expect(value('cp')).toBe('1499');
    expect(status()).toContain('1 image could not be read.');
  });

  it('does nothing when the picker is cancelled', async () => {
    readScreenshot.mockClear();
    await choose(null);
    expect(readScreenshot).not.toHaveBeenCalled();
  });
});

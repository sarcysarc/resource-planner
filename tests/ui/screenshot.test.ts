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
const value = (name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value;
const status = () => root.querySelector('[data-scan-status]')!.textContent;

async function choose(file: File | null): Promise<void> {
  const input = root.querySelector<HTMLInputElement>('[name="screenshot"]')!;
  Object.defineProperty(input, 'files', { value: file ? [file] : [], configurable: true });
  input.dispatchEvent(new Event('change'));
  await vi.waitFor(() => expect(status()).not.toContain('Reading'));
}

describe('wireScreenshot', () => {
  beforeEach(() => {
    document.body.innerHTML = '<fieldset data-legend="Current"></fieldset>';
    root = document.querySelector('fieldset')!;
    buildCandidateFields(root);
    wireScreenshot(root);
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

  it('does nothing when the picker is cancelled', async () => {
    readScreenshot.mockClear();
    await choose(null);
    expect(readScreenshot).not.toHaveBeenCalled();
  });
});

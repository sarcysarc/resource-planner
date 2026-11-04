// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCandidateFields } from '../../src/ui/candidateFields';

const recognizeText = vi.fn<(image: Blob) => Promise<string>>(async () => 'CP1499\n191 / 191 HP\nPOWER UP 9,000 12');
vi.mock('../../src/ocr/recognize', () => ({ recognizeText }));

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
  });

  it('uses the Shadow and Lucky choices to judge the Stardust cost', async () => {
    root.querySelector<HTMLSelectElement>('[name="variant"]')!.value = 'shadow';
    await choose(new File(['x'], 'screen.png'));
    expect(value('dust')).toBe('');
  });

  it('says when the screenshot has nothing it can read', async () => {
    recognizeText.mockResolvedValueOnce('Settings');
    await choose(new File(['x'], 'other.png'));
    expect(value('cp')).toBe('');
    expect(status()).toContain('Could not find');
  });

  it('reports a failed read', async () => {
    recognizeText.mockRejectedValueOnce(new Error('boom'));
    await choose(new File(['x'], 'broken.png'));
    expect(status()).toContain('Could not read');
  });

  it('does nothing when the picker is cancelled', async () => {
    recognizeText.mockClear();
    await choose(null);
    expect(recognizeText).not.toHaveBeenCalled();
  });
});

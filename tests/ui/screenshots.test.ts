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
const useAccount = vi.fn((totals: object) => `Your totals: ${JSON.stringify(totals)}.`);
const profile: Scan = { words: wordsOf('LEVEL\nTOTAL ACTIVITY'), cpText: '', digits: { trainerLevel: '30' } };
const status = () => document.querySelector('[data-shots-status]')!.textContent;
const choice = () => document.querySelector<HTMLElement>('[data-shots-choice]')!;
const picks = (r: Reading) => r.name;

async function choose(screens: Scan[]): Promise<void> {
  screens.forEach((s) => readScreenshot.mockResolvedValueOnce(s));
  const input = document.querySelector<HTMLInputElement>('[name="screenshots"]')!;
  Object.defineProperty(input, 'files', { value: screens.map((_, i) => new File(['x'], `${i}.png`)), configurable: true });
  input.dispatchEvent(new Event('change'));
  await vi.waitFor(() => expect(status()).not.toContain('Reading'));
}

describe('wireScreenshots', () => {
  beforeEach(() => {
    const html = readFileSync('index.html', 'utf8');
    document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
    use.mockClear();
    useAccount.mockClear();
    wireScreenshots({ root: document.querySelector('[data-shots]')!, familyOf: picks, use, useAccount });
  });

  it('puts the first Pokémon in Current and the second in Alternative', async () => {
    await choose([screen('Lairon', 80), screen('Aggron', 120), screen('Lairon', 80)]);
    expect(use.mock.calls.map(([side, group]) => [side, group.reading.name, group.shots])).toEqual([
      ['current', 'Lairon', 2],
      ['alternative', 'Aggron', 1],
    ]);
    expect(status()).toBe('Read 3 screenshots: 2 Pokémon.');
    expect(choice().hidden).toBe(true);
  });

  it('fills only Current for one Pokémon', async () => {
    await choose([screen('Lairon', 80)]);
    expect(use.mock.calls.map(([side]) => side)).toEqual(['current']);
  });

  it('lets the player pick two when there are more', async () => {
    await choose([screen('Aron', 50), screen('Lairon', 80), screen('Aggron', 120)]);
    expect(use).not.toHaveBeenCalled();
    expect(choice().hidden).toBe(false);
    expect(status()).toContain('Pick the two to compare.');
    const alternative = document.querySelector<HTMLSelectElement>('[name="pickAlternative"]')!;
    expect([...alternative.options].map((o) => o.textContent)).toEqual(['Aron, CP 600', 'Lairon, CP 600', 'Aggron, CP 600']);
    alternative.value = '2';
    document.querySelector<HTMLButtonElement>('[data-shots-use]')!.click();
    expect(use.mock.calls.map(([side, group]) => [side, group.reading.name])).toEqual([
      ['current', 'Aron'],
      ['alternative', 'Aggron'],
    ]);
  });

  it('asks for two different Pokémon', async () => {
    await choose([screen('Aron', 50), screen('Lairon', 80), screen('Aggron', 120)]);
    document.querySelector<HTMLSelectElement>('[name="pickAlternative"]')!.value = '0';
    document.querySelector<HTMLButtonElement>('[data-shots-use]')!.click();
    expect(use).not.toHaveBeenCalled();
    expect(status()).toContain('Pick two different Pokémon.');
  });

  it('keeps a profile screenshot out of the Pokémon and fills its trainer level', async () => {
    await choose([profile, screen('Lairon', 80)]);
    expect(use.mock.calls.map(([side, group]) => [side, group.shots])).toEqual([['current', 1]]);
    expect(useAccount).toHaveBeenCalledWith({ trainerLevel: 30 });
    expect(status()).toBe('Read 2 screenshots: 1 Pokémon. Your totals: {"trainerLevel":30}.');
  });

  it('reads a bag or profile screenshot on its own', async () => {
    await choose([profile]);
    expect(use).not.toHaveBeenCalled();
    expect(status()).toBe('Read 1 screenshot. Your totals: {"trainerLevel":30}.');
  });

  it('says when no Pokémon was found', async () => {
    await choose([{ words: wordsOf('Settings'), cpText: '', digits: {} }]);
    expect(use).not.toHaveBeenCalled();
    expect(status()).toBe('No Pokémon found in these screenshots. Use the Pokémon or appraisal screen.');
    expect(useAccount).not.toHaveBeenCalled();
  });
});

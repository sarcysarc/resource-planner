// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mergeReadings } from '../../src/core/screen/merge';
import { readScan } from '../../src/core/screen/read';
import type { Scan } from '../../src/core/screen/types';
import { buildCandidateFields } from '../../src/ui/candidateFields';
import { fillCandidate } from '../../src/ui/screenshot';
import { wordsOf } from '../core/screen/wordsOf';

const scan = (text: string, extra: Partial<Scan> = {}): Scan => ({ words: wordsOf(text), cpText: '', digits: {}, ...extra });
const POKEMON_SCREEN = scan('CP1499\n191 / 191 HP\nPOWER UP 9,000 12');
const group = (...scans: Scan[]) => mergeReadings(scans.map((s) => readScan(s, { variant: 'normal', lucky: false })));

let root: HTMLFieldSetElement;
const checked = (name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!.checked;
const value = (name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value;
const status = () => root.querySelector('[data-scan-status]')!.textContent;
const finder = () => root.querySelector<HTMLDetailsElement>('details.finder')!;

describe('fillCandidate', () => {
  beforeEach(() => {
    document.body.innerHTML = '<fieldset data-legend="Current"></fieldset>';
    root = document.querySelector('fieldset')!;
    buildCandidateFields(root);
  });

  it('fills CP, HP and Stardust, and opens the IV finder', () => {
    fillCandidate(root, group(POKEMON_SCREEN));
    expect([value('cp'), value('seenHp'), value('dust')]).toEqual(['1499', '191', '9000']);
    expect(status()).toContain('CP 1499, HP 191, Stardust 9000');
    expect(finder().open).toBe(true);
  });

  it('fills CP, HP and the IVs from an appraisal', () => {
    fillCandidate(root, group(scan('cr 999\n85 / 85 HP', { cpText: '«615 ou.', ivs: { atk: 12, def: 12, hp: 15 } })));
    expect(['cp', 'seenHp', 'atk', 'def', 'hp'].map(value)).toEqual(['615', '85', '12', '12', '15']);
    expect(status()).toBe('Read CP 615, HP 85, IVs 12/12/15. Check them.');
    expect(finder().open).toBe(false);
  });

  it('fills Shadow or Purified, Lucky and the second move when the screen shows them', () => {
    const text = 'LUCKY POKEMON\n80 / 80 HP\nEVOLVE 50\nGYMS & RAIDS\nO Lick\nO Return\nO Thunder\nCAUGHT AFTER DEFEATING GRUNT';
    fillCandidate(root, group(scan(text, { cpText: '600' })));
    expect([value('variant'), checked('lucky'), checked('secondMove')]).toEqual(['purified', true, true]);
    expect(status()).toBe('Read CP 600, HP 80, Purified, Lucky, second move unlocked, 50 Candy for the next evolution. Check them, then tap Find IVs.');
  });

  it('says when nothing could be read, and what failed', () => {
    fillCandidate(root, group(scan('Settings')), 1);
    expect(value('cp')).toBe('');
    expect(status()).toBe('Could not find CP or HP. Use a screenshot of the Pokémon or appraisal screen. 1 image could not be read.');
  });

  it('asks when the screenshots disagree, and leaves that field alone', () => {
    fillCandidate(root, group(POKEMON_SCREEN, scan('CP1500\n191 / 191 HP')));
    expect(value('cp')).toBe('');
    expect(status()).toContain('The screenshots disagree on CP: 1499 or 1500. Type the right one.');
  });
});

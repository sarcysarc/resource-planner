// Issue #3: a batch shared while step 1 asks about the last one waits its turn, not drops it.
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Group } from '../../src/core/screen/merge';
import type { Reading, Scan } from '../../src/core/screen/types';
import { wordsOf } from '../core/screen/wordsOf';

const screen = (name: string, hp: number): Scan => ({ words: wordsOf(`${name}\n${hp} / ${hp} HP`), cpText: '600', digits: {} });
const readScreenshot = vi.fn<(image: Blob) => Promise<Scan>>();
vi.mock('../../src/ocr/recognize', () => ({ openReader: async () => ({ read: readScreenshot, close: async () => undefined }) }));

const { wireScreenshots } = await import('../../src/ui/screenshots');

const use = vi.fn();
const onDone = vi.fn();
const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const questions = () => q('[data-questions]');
const waiting = () => q('[data-shots-waiting]');
const stagesOf = (r: Reading) => (r.name === 'Dratini' ? [{ name: 'Dratini' }, { name: 'Dragonair' }] : [{ name: r.name ?? '' }]);
const named = () => use.mock.calls.map(([group]) => (group as Group).reading.name);

function choose(screens: Scan[], names: string[]): void {
  screens.forEach((s) => readScreenshot.mockResolvedValueOnce(s));
  const input = q<HTMLInputElement>('[name="screenshots"]');
  Object.defineProperty(input, 'files', { value: names.map((name) => new File([name], name)), configurable: true });
  input.dispatchEvent(new Event('change'));
}

function answerFirst(value: string): void {
  const select = questions().querySelector('select')!;
  select.value = value;
  select.dispatchEvent(new Event('change'));
  questions().querySelector('button')!.click();
}

describe('wireScreenshots, one batch after another', () => {
  beforeEach(() => {
    const html = readFileSync('index.html', 'utf8');
    document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
    [use, onDone, readScreenshot].forEach((f) => f.mockReset());
    wireScreenshots({ root: q('[data-shots]'), familyOf: (r) => r.name, stagesOf, use, useAccount: () => '', onDone });
  });

  it('keeps a batch waiting on a question, and reads the next one after it', async () => {
    choose([screen('Dratini', 80), screen('Lairon', 50)], ['a.png', 'b.png']);
    await vi.waitFor(() => expect(questions().hidden).toBe(false));
    choose([screen('Aron', 40)], ['c.png']);
    await vi.waitFor(() => expect(waiting().textContent).toBe('1 more screenshot will be read after these.'));
    expect([waiting().hidden, use.mock.calls.length]).toEqual([false, 0]);
    answerFirst('"Dragonair"');
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledTimes(2));
    expect(named()).toEqual(['Dragonair', 'Lairon', 'Aron']);
    expect(waiting().hidden).toBe(true);
  });

  it('asks the next batch’s questions once the open ones are answered', async () => {
    choose([screen('Dratini', 80)], ['a.png']);
    await vi.waitFor(() => expect(questions().hidden).toBe(false));
    choose([screen('Dratini', 81)], ['b.png']);
    // Time for the second batch to be read, as when the player shares again before answering.
    await new Promise((resolve) => setTimeout(resolve, 50));
    answerFirst('"Dragonair"');
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(questions().hidden).toBe(false));
    answerFirst('"Dratini"');
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledTimes(2));
    expect(named()).toEqual(['Dragonair', 'Dratini']);
  });
});

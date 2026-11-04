// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { hideSaved, savedNote, showSaved, wireSteps } from '../../src/ui/steps';

const step = (name: string) => document.querySelector<HTMLElement>(`[data-step="${name}"]`)!;
const note = () => document.querySelector('[data-check-note]')!.textContent;
const saved = () => document.querySelector<HTMLElement>('[data-saved]')!;
const shown = () => ['shots', 'check', 'answer'].filter((name) => !step(name).hidden);

describe('wireSteps', () => {
  let steps: ReturnType<typeof wireSteps>;

  beforeEach(() => {
    const html = readFileSync('index.html', 'utf8');
    document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
    steps = wireSteps(document);
  });

  it('opens on the screenshots step alone, numbered', () => {
    expect(shown()).toEqual(['shots']);
    const headings = [...document.querySelectorAll('[data-step] h2')].map((h) => h.textContent?.replace(/\s+/g, ' ').trim());
    expect(headings).toEqual(['1 Add screenshots', '2 Check the details', '3 See the answer']);
  });

  it('says which screenshots to take', () => {
    const list = step('shots').querySelector('ul')!.textContent!;
    expect(list).toContain('Appraise');
    expect(list).toContain('item bag');
  });

  it('shows the rest for typing when asked', () => {
    document.querySelector<HTMLButtonElement>('[data-step-skip]')!.click();
    expect(shown()).toEqual(['shots', 'check', 'answer']);
    expect(note()).toMatch(/^Type in what the game shows/);
  });

  it('shows the rest once screenshots are read, asking to check them', () => {
    steps.reveal();
    expect(shown()).toEqual(['shots', 'check', 'answer']);
    expect(note()).toMatch(/^Read from your screenshots\. Check/);
  });
  it('says in step 1 what was saved from last time, and opens the rest to show it', () => {
    expect(saved().hidden).toBe(true);
    showSaved(document, { target: 'Palossand', count: 2 });
    expect(saved().hidden).toBe(false);
    expect(saved().textContent).toContain('Saved from last time: 2 Pokémon (Palossand). New screenshots join them.');
    expect(saved().querySelector('[data-clear-grid]')).not.toBeNull();
    expect(shown()).toEqual(['shots', 'check', 'answer']);
    hideSaved(document);
    expect(saved().hidden).toBe(true);
  });

  it('words the saved note for one Pokémon, and without a target', () => {
    expect(savedNote(1, 'Gengar')).toBe('Saved from last time: 1 Pokémon (Gengar). New screenshots join it.');
    expect(savedNote(3, '')).toBe('Saved from last time: 3 Pokémon. New screenshots join them.');
  });
});

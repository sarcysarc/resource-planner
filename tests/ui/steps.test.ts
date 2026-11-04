// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { wireSteps } from '../../src/ui/steps';

const step = (name: string) => document.querySelector<HTMLElement>(`[data-step="${name}"]`)!;
const note = () => document.querySelector('[data-check-note]')!.textContent;
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
});

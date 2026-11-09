// The page's stylesheet against the markup that uses it.
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

const displayOf = (html: string) => {
  const box = document.createElement('div');
  box.innerHTML = html;
  document.body.append(box);
  return getComputedStyle(box.firstElementChild!).display;
};

describe('style.css', () => {
  beforeAll(() => {
    const style = document.createElement('style');
    style.textContent = readFileSync('src/style.css', 'utf8');
    document.head.append(style);
  });

  // Issue #7: `.saved { display: flex }` showed an empty Clear box on a first visit. jsdom
  // lets `hidden` win over a class's display, which browsers don't, so the rule is read.
  it('keeps hidden boxes hidden though their class lays them out', () => {
    expect(readFileSync('src/style.css', 'utf8')).toMatch(/\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/);
  });

  it('still lays out the same boxes once shown', () => {
    expect(displayOf('<div class="saved" data-saved></div>')).toBe('flex');
    expect(displayOf('<nav class="lines" data-lines></nav>')).toBe('flex');
  });
});

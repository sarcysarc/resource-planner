// Candy to evolve (ADR 0019): from data, and typed once where the data has none. Found in
// use with a Pikachu line, where the cost typed into one tile was asked for on every other.
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';

const { mountApp } = await import('../../src/ui/app');

const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const tiles = () => [...document.querySelectorAll<HTMLElement>('[data-details] > [data-tile]')];
const field = (root: ParentNode, name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
const evolve = (root: HTMLElement) => field(root, 'evolveCandy').value;

// As a player types: input as each key goes in, change when the field is left.
function type(el: HTMLInputElement | HTMLSelectElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function load(): void {
  const html = readFileSync('index.html', 'utf8');
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  mountApp(document);
}

// Two Pokémon typed in by hand, of this form, battling as the target.
function twoOf(target: string, form: string): HTMLElement[] {
  type(q('#target'), target);
  q('[data-step-skip]').click();
  tiles().forEach((root) => type(field(root, 'form'), form));
  return tiles();
}

function addOne(form: string): HTMLElement {
  q('[data-add-tile]').click();
  const root = tiles().at(-1)!;
  type(field(root, 'form'), form);
  return root;
}

Element.prototype.scrollIntoView = () => undefined;

describe('Candy to evolve from data', () => {
  beforeEach(load);

  it('fills every tile of a line with no screenshot or typing', () => {
    const [a, b] = twoOf('Raichu', 'pikachu');
    expect([evolve(a), evolve(b)]).toEqual(['50', '50']);
  });

  it('adds up each step, with the Purified discount', () => {
    const [a, b] = twoOf('Raichu', 'pikachu');
    type(field(a, 'form'), 'pichu');
    type(field(b, 'variant'), 'purified');
    expect([evolve(a), evolve(b)]).toEqual(['75', '45']);
  });
});

// Scyther evolves into Kleavor with an item, and the data has no Candy cost for it.
describe('Candy to evolve typed where the data has none', () => {
  beforeEach(load);

  it('fills the other tiles of the same step', () => {
    const [a, b] = twoOf('Kleavor', 'scyther');
    expect(evolve(b)).toBe('');
    type(field(a, 'evolveCandy'), '50');
    expect([evolve(a), evolve(b)]).toEqual(['50', '50']);
  });

  it('fills a tile added later in the same visit', () => {
    const [a] = twoOf('Kleavor', 'scyther');
    type(field(a, 'evolveCandy'), '50');
    expect(evolve(addOne('scyther'))).toBe('50');
  });

  it('keeps a typed total in its own tile when another tile teaches a different cost', () => {
    const [a, b] = twoOf('Kleavor', 'scyther');
    type(field(a, 'evolveCandy'), '50');
    type(field(b, 'evolveCandy'), '25');
    expect([evolve(a), evolve(b), evolve(addOne('scyther'))]).toEqual(['50', '25', '25']);
  });

  it('does not learn a number that is not one of the game’s costs', () => {
    const [a, b] = twoOf('Kleavor', 'scyther');
    type(field(a, 'evolveCandy'), '49');
    expect([evolve(a), evolve(b)]).toEqual(['49', '']);
  });
});

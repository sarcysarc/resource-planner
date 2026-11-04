// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { buildCandidateFields } from '../../src/ui/candidateFields';
import { type EvolveMemory, fillEvolve, rememberStep, wireEvolve } from '../../src/ui/evolveMemory';
import { evolutionLine, findSpecies, loadBundledIndex } from '../../src/ui/species';

const index = loadBundledIndex();
const target = findSpecies(index, 'Dragonite')!;
let root: HTMLFieldSetElement;
let memory: EvolveMemory;
const field = (name: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
const fill = () => fillEvolve(root, { index, target, memory });

describe('evolve memory', () => {
  beforeEach(() => {
    document.body.innerHTML = '<fieldset></fieldset>';
    root = document.querySelector('fieldset')!;
    buildCandidateFields(root);
    field('form').replaceChildren(...evolutionLine(index, target).map((s) => new Option(s.name, s.id)));
    field('form').value = 'dratini';
    memory = new Map();
  });

  it('fills the total once every step to the target is known', () => {
    rememberStep(memory, { from: 'dratini', shown: 25, variant: 'normal' });
    rememberStep(memory, { from: 'dragonair', shown: 100, variant: 'normal' });
    expect(fill()).toBe('125 Candy to evolve into Dragonite.');
    expect(field('evolveCandy').value).toBe('125');
  });

  it('leaves the field and names the missing step', () => {
    field('evolveCandy').value = '7';
    rememberStep(memory, { from: 'dratini', shown: 25, variant: 'normal' });
    expect(fill()).toBe('The Candy to evolve Dragonair is not known yet: add a screenshot of one, or type the total.');
    expect(field('evolveCandy').value).toBe('7');
  });

  it('clears a total it filled once a step is no longer known, as for a new target', () => {
    rememberStep(memory, { from: 'dratini', shown: 25, variant: 'normal' });
    field('form').value = 'dratini';
    fillEvolve(root, { index, target: findSpecies(index, 'Dragonair')!, memory });
    expect(field('evolveCandy').value).toBe('25');
    fill();
    expect(field('evolveCandy').value).toBe('');
  });

  it('sets zero when the form is the target', () => {
    field('form').value = 'dragonite';
    field('evolveCandy').value = '25';
    expect(fill()).toBeUndefined();
    expect(field('evolveCandy').value).toBe('0');
  });

  it('applies the Purified discount to each step, whichever variant the screen showed', () => {
    rememberStep(memory, { from: 'dratini', shown: 23, variant: 'purified' });
    rememberStep(memory, { from: 'dragonair', shown: 100, variant: 'shadow' });
    field('variant').value = 'purified';
    fill();
    expect(field('evolveCandy').value).toBe('113');
    field('variant').value = 'normal';
    fill();
    expect(field('evolveCandy').value).toBe('125');
  });
});

describe('wireEvolve', () => {
  const roots: HTMLElement[] = [];
  let targetInput: HTMLInputElement;
  let onRead: ReturnType<typeof wireEvolve>;
  const at = (i: number, name: string) => roots[i].querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
  const setLine = (name: string) => {
    targetInput.value = name;
    const line = evolutionLine(index, findSpecies(index, name)!);
    for (const r of roots) r.querySelector('select[name="form"]')!.replaceChildren(...line.map((s) => new Option(s.name, s.id)));
  };

  beforeEach(() => {
    document.body.innerHTML = '<input id="t"><fieldset><p data-scan-status></p></fieldset><fieldset><p data-scan-status></p></fieldset>';
    targetInput = document.querySelector('#t')!;
    roots.splice(0, 2, ...document.querySelectorAll('fieldset'));
    roots.forEach((r) => buildCandidateFields(r));
    setLine('Dragonite');
    onRead = wireEvolve({ index, target: targetInput, roots });
    at(0, 'form').value = 'dratini';
    at(1, 'form').value = 'dragonair';
  });

  it('fills both candidates once each stage has been read, and notes it on the one read', () => {
    onRead(roots[1], { name: 'Dragonair', evolveCandy: 100 });
    expect(at(1, 'evolveCandy').value).toBe('100');
    onRead(roots[0], { name: 'Dratini', evolveCandy: 25 });
    expect([at(0, 'evolveCandy').value, at(1, 'evolveCandy').value]).toEqual(['125', '100']);
    expect(roots[0].querySelector('[data-scan-status]')!.textContent).toContain('125 Candy to evolve into Dragonite.');
  });

  it('tells the other candidate which step it still lacks, since its total stays as typed', () => {
    onRead(roots[1], { name: 'Dragonair', evolveCandy: 100 });
    expect(roots[0].querySelector('[data-scan-status]')!.textContent).toContain('The Candy to evolve Dratini is not known yet');
  });

  it('learns nothing from a reading without a cost or a single species', () => {
    onRead(roots[0], { name: 'Dratini' });
    onRead(roots[0], { evolveCandy: 25 });
    expect(at(0, 'evolveCandy').value).toBe('');
  });

  it('refills when the variant or the target changes, but not when the total is typed', () => {
    onRead(roots[0], { name: 'Dratini', evolveCandy: 25 });
    onRead(roots[1], { name: 'Dragonair', evolveCandy: 100 });
    at(0, 'variant').value = 'purified';
    at(0, 'variant').dispatchEvent(new Event('change', { bubbles: true }));
    expect(at(0, 'evolveCandy').value).toBe('113');
    at(0, 'evolveCandy').value = '5';
    at(0, 'evolveCandy').dispatchEvent(new Event('change', { bubbles: true }));
    expect(at(0, 'evolveCandy').value).toBe('5');
    setLine('Dragonair');
    targetInput.dispatchEvent(new Event('change'));
    expect(at(0, 'evolveCandy').value).toBe('23');
  });
});

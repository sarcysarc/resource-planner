// Remembers each species' evolve cost read from screenshots or typed while the page is
// open, over the bundled table's (ADR 0019), and fills a candidate's "Candy to evolve"
// with the whole total from its form to the target (F2).
import { baseCost, evolveTotal } from '../core/evolveCandy';
import type { Reading } from '../core/screen/types';
import type { Variant } from '../core/types';
import { candidateRoots } from './candidateFields';
import type { KnownCosts } from './evolveData';
import { teachTyped } from './evolveTeach';
import { resolveSpecies } from './scanSpecies';
import { addStatus } from './scanTarget';
import { evolutionLine, findSpecies, type Species, type SpeciesIndex } from './species';

/** Species id to the undiscounted Candy for evolving from it. */
export type EvolveMemory = Map<string, number>;

export interface Step {
  from: string;
  shown: number;
  variant: Variant;
}

export interface EvolvePlan {
  index: SpeciesIndex;
  target: Species;
  memory: EvolveMemory;
  /** Costs from data, by the species evolved into; the memory wins over them. */
  known?: KnownCosts;
}

/** A step from a species, with its undiscounted cost if known. */
export interface StepCost {
  from: Species;
  base: number | undefined;
}

const VARIANTS: readonly Variant[] = ['normal', 'shadow', 'purified'];
const field = (root: ParentNode, name: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
export const variantOf = (root: ParentNode) => VARIANTS.find((v) => v === field(root, 'variant').value) ?? 'normal';

export function rememberStep(memory: EvolveMemory, step: Step): void {
  memory.set(step.from, baseCost(step.shown, step.variant));
}

// A total this filled is cleared once it no longer holds; a typed one is left alone.
function showTotal(input: HTMLInputElement, total: number | undefined): void {
  if (total === undefined && input.value === input.dataset.filled) input.value = '';
  if (total !== undefined) input.value = String(total);
  input.dataset.filled = total === undefined ? '' : input.value;
}

/**
 * Fills the total from the candidate's form to the target when every step is known, and
 * otherwise leaves what is typed. Returns a note for the status line, if any.
 */
export function fillEvolve(root: ParentNode, plan: EvolvePlan): string | undefined {
  const steps = stepsOf(root, plan);
  if (!steps) return undefined;
  const total = evolveTotal(steps.map((s) => s.base), variantOf(root));
  showTotal(field(root, 'evolveCandy') as HTMLInputElement, total);
  if (total) return `${total} Candy to evolve into ${plan.target.name}.`;
  const missing = steps.find((s) => s.base === undefined)?.from;
  return missing && `The Candy to evolve ${missing.name} is not known yet: add a screenshot of one, or type the total.`;
}

/** Each step from the candidate's form to the target, or nothing when the form is not on the line. */
export function stepsOf(root: ParentNode, plan: EvolvePlan): StepCost[] | undefined {
  const line = evolutionLine(plan.index, plan.target);
  const at = line.findIndex((s) => s.id === field(root, 'form').value);
  if (at === -1) return undefined;
  return line.slice(at, -1).map((from, i) => ({ from, base: plan.memory.get(from.id) ?? plan.known?.get(line[at + i + 1].id) }));
}

export interface EvolveWiring {
  index: SpeciesIndex;
  /** The battle target, shared by every candidate. */
  target: HTMLInputElement;
  /** Where the candidates are; they can be added at any time. */
  area: HTMLElement;
  /** Costs from data; none when left out. */
  known?: KnownCosts;
}

// Only a reading of one known species with a cost on screen teaches a step.
function rememberReading(plan: Omit<EvolvePlan, 'target'>, root: ParentNode, reading: Reading): void {
  const found = resolveSpecies(plan.index, reading);
  if (reading.evolveCandy === undefined || found.length !== 1) return;
  rememberStep(plan.memory, { from: found[0].id, shown: reading.evolveCandy, variant: variantOf(root) });
}

// Only the choices the total depends on refill it, so a typed total is not overwritten;
// a typed total teaches its step.
function onTileChange(event: Event, plan: EvolvePlan | undefined, area: HTMLElement): void {
  const changed = event.target as HTMLSelectElement;
  const root = changed.closest<HTMLElement>('[data-candidate]');
  if (!root || !plan) return;
  if (['form', 'variant'].includes(changed.name)) fillEvolve(root, plan);
  if (changed.name === 'evolveCandy') teachTyped(root, plan, area);
}

/**
 * Keeps every candidate's totals current as the target, form or variant changes. Wire it
 * after the form choices follow the target. Returns what to call with each reading.
 */
export function wireEvolve(w: EvolveWiring): (root: HTMLElement, reading: Reading) => void {
  const memory: EvolveMemory = new Map();
  const plan = () => {
    const target = findSpecies(w.index, w.target.value);
    return target && { index: w.index, target, memory, known: w.known };
  };
  const fill = (root: HTMLElement) => {
    const p = plan();
    return p && fillEvolve(root, p);
  };
  w.target.addEventListener('change', () => candidateRoots(w.area).forEach(fill));
  w.area.addEventListener('change', (event) => onTileChange(event, plan(), w.area));
  return (root, reading) => {
    rememberReading({ index: w.index, memory }, root, reading);
    for (const r of candidateRoots(w.area)) addStatus(r, fill(r) ?? '');
  };
}

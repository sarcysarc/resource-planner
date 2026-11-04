// Remembers each species' evolve cost read from screenshots while the page is open, so it
// is not asked for twice, and fills a candidate's "Candy to evolve" with the whole
// total from its form to the target (F2). A screen shows only the next step's cost.
import { baseCost, evolveTotal } from '../core/evolveCandy';
import type { Reading } from '../core/screen/types';
import type { Variant } from '../core/types';
import { candidateRoots } from './candidateFields';
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
}

const VARIANTS: readonly Variant[] = ['normal', 'shadow', 'purified'];
const field = (root: ParentNode, name: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
const variantOf = (root: ParentNode) => VARIANTS.find((v) => v === field(root, 'variant').value) ?? 'normal';

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
  const line = evolutionLine(plan.index, plan.target);
  const at = line.findIndex((s) => s.id === field(root, 'form').value);
  if (at === -1) return undefined;
  const steps = line.slice(at, -1);
  const total = evolveTotal(steps.map((s) => plan.memory.get(s.id)), variantOf(root));
  showTotal(field(root, 'evolveCandy') as HTMLInputElement, total);
  if (total) return `${total} Candy to evolve into ${plan.target.name}.`;
  const missing = steps.find((s) => !plan.memory.has(s.id));
  return missing && `The Candy to evolve ${missing.name} is not known yet: add a screenshot of one, or type the total.`;
}

export interface EvolveWiring {
  index: SpeciesIndex;
  /** The battle target, shared by every candidate. */
  target: HTMLInputElement;
  /** Where the candidates are; they can be added at any time. */
  area: HTMLElement;
}

// Only a reading of one known species with a cost on screen teaches a step.
function rememberReading(plan: Omit<EvolvePlan, 'target'>, root: ParentNode, reading: Reading): void {
  const found = resolveSpecies(plan.index, reading);
  if (reading.evolveCandy === undefined || found.length !== 1) return;
  rememberStep(plan.memory, { from: found[0].id, shown: reading.evolveCandy, variant: variantOf(root) });
}

/**
 * Keeps every candidate's totals current as the target, form or variant changes. Wire it
 * after the form choices follow the target. Returns what to call with each reading.
 */
export function wireEvolve(w: EvolveWiring): (root: HTMLElement, reading: Reading) => void {
  const memory: EvolveMemory = new Map();
  const fill = (root: HTMLElement) => {
    const target = findSpecies(w.index, w.target.value);
    return target && fillEvolve(root, { index: w.index, target, memory });
  };
  w.target.addEventListener('change', () => candidateRoots(w.area).forEach(fill));
  // Only the choices the total depends on, so a typed total is not overwritten.
  w.area.addEventListener('change', (event) => {
    const field = event.target as HTMLSelectElement;
    const root = field.closest<HTMLElement>('[data-candidate]');
    if (root && ['form', 'variant'].includes(field.name)) fill(root);
  });
  return (root, reading) => {
    rememberReading({ index: w.index, memory }, root, reading);
    for (const r of candidateRoots(w.area)) addStatus(r, fill(r) ?? '');
  };
}

// Remembers each species' evolve cost read from screenshots while the page is open, so it
// is not asked for twice, and fills a candidate's "Candy to evolve" with the whole
// total from its form to the target (F2). A screen shows only the next step's cost.
import { baseCost, evolveTotal } from '../core/evolveCandy';
import type { Reading } from '../core/screen/types';
import type { Variant } from '../core/types';
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
  if (total !== undefined) field(root, 'evolveCandy').value = String(total);
  if (total) return `${total} Candy to evolve into ${plan.target.name}.`;
  const missing = steps.find((s) => !plan.memory.has(s.id));
  return missing && `The Candy to evolve ${missing.name} is not known yet: add a screenshot of one, or type the total.`;
}

export interface EvolveWiring {
  index: SpeciesIndex;
  /** The battle target, shared by both candidates. */
  target: HTMLInputElement;
  roots: HTMLElement[];
}

// Only a reading of one known species with a cost on screen teaches a step.
function rememberReading(plan: Omit<EvolvePlan, 'target'>, root: ParentNode, reading: Reading): void {
  const found = resolveSpecies(plan.index, reading);
  if (reading.evolveCandy === undefined || found.length !== 1) return;
  rememberStep(plan.memory, { from: found[0].id, shown: reading.evolveCandy, variant: variantOf(root) });
}

/**
 * Keeps both candidates' totals current as the target, form or variant changes. Wire it
 * after the form choices follow the target. Returns what to call with each reading.
 */
export function wireEvolve(w: EvolveWiring): (root: HTMLElement, reading: Reading) => void {
  const memory: EvolveMemory = new Map();
  const fill = (root: HTMLElement) => {
    const target = findSpecies(w.index, w.target.value);
    return target && fillEvolve(root, { index: w.index, target, memory });
  };
  w.target.addEventListener('change', () => w.roots.forEach(fill));
  // Only the choices the total depends on, so a typed total is not overwritten.
  const affects = (event: Event) => ['form', 'variant'].includes((event.target as HTMLSelectElement).name);
  for (const root of w.roots) root.addEventListener('change', (event) => affects(event) && fill(root));
  return (root, reading) => {
    rememberReading({ index: w.index, memory }, root, reading);
    w.roots.filter((r) => r !== root).forEach(fill);
    addStatus(root, fill(root) ?? '');
  };
}

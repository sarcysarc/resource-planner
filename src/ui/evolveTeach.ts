// A typed Candy to evolve teaches its one unknown step (ADR 0019), and the other tiles of
// the line are refilled, except where the player typed a total of their own.
import { BASE_COSTS, stepCost } from '../core/evolveCandy';
import type { Variant } from '../core/types';
import { candidateRoots } from './candidateFields';
import { type EvolvePlan, fillEvolve, type StepCost, stepsOf, variantOf } from './evolveMemory';

const totalField = (root: ParentNode) => root.querySelector<HTMLInputElement>('[name="evolveCandy"]')!;

// The one step to learn: the only unknown one, or the only step when all are known.
function stepToLearn(steps: readonly StepCost[]): StepCost | undefined {
  const unknown = steps.filter((s) => s.base === undefined);
  return unknown.length === 1 ? unknown[0] : steps.length === 1 ? steps[0] : undefined;
}

// The game cost whose discounted step is what is left of the typed total, if there is one.
function baseFor(left: number, variant: Variant): number | undefined {
  return BASE_COSTS.find((c) => stepCost(c, variant) === left);
}

const restOf = (steps: readonly StepCost[], learn: StepCost, variant: Variant) =>
  steps.filter((s) => s !== learn).reduce((sum, s) => sum + stepCost(s.base!, variant), 0);

// A total typed by the player, not one this filled.
const isTyped = (input: HTMLInputElement) => input.value !== '' && input.value !== input.dataset.filled;

export function teachTyped(root: HTMLElement, plan: EvolvePlan, area: HTMLElement): void {
  const steps = stepsOf(root, plan);
  const typed = Number(totalField(root).value);
  const learn = steps && stepToLearn(steps);
  if (!learn || !Number.isInteger(typed) || typed <= 0) return;
  const variant = variantOf(root);
  const base = baseFor(typed - restOf(steps, learn, variant), variant);
  if (base === undefined) return;
  plan.memory.set(learn.from.id, base);
  for (const r of candidateRoots(area)) if (r !== root && !isTyped(totalField(r))) fillEvolve(r, plan);
}

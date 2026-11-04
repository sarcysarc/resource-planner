import type { Variant } from './types';

/** Candy to evolve, before any discount. Each species' next step costs one of these. */
export const BASE_COSTS: readonly number[] = [12, 25, 50, 100, 200, 400];

// Purified Pokémon evolve for 10% less. The game's rounding for 12 and 25 is not known,
// so a plan rounds up and never falls short. Whole-number maths avoids 50 * 0.9 drift.
const discounted = (base: number) => [Math.floor((base * 9) / 10), Math.ceil((base * 9) / 10)];

/** Every cost an EVOLVE button can show, with or without the Purified discount. */
export const SHOWN_COSTS: ReadonlySet<number> = new Set(BASE_COSTS.flatMap((c) => [c, ...discounted(c)]));

/** The undiscounted cost behind the one a screen showed for this variant. */
export function baseCost(shown: number, variant: Variant): number {
  if (variant !== 'purified') return shown;
  return BASE_COSTS.find((c) => discounted(c).includes(shown)) ?? shown;
}

/** What one step costs this variant. */
export function stepCost(base: number, variant: Variant): number {
  return variant === 'purified' ? Math.ceil((base * 9) / 10) : base;
}

/** Candy for every step to the target, or undefined while any step's cost is unknown. */
export function evolveTotal(steps: readonly (number | undefined)[], variant: Variant): number | undefined {
  if (steps.some((s) => s === undefined)) return undefined;
  return steps.reduce<number>((sum, base) => sum + stepCost(base!, variant), 0);
}

/**
 * The Purified total for a total of undiscounted steps, split into base costs from the
 * largest. A typed total that is not made of them is discounted as a whole.
 */
export function purifiedTotal(total: number): number {
  let left = total;
  let sum = 0;
  for (const base of [...BASE_COSTS].reverse()) {
    const count = Math.floor(left / base);
    sum += count * stepCost(base, 'purified');
    left -= count * base;
  }
  return sum + stepCost(left, 'purified');
}

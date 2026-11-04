import { stepCost } from '../data/powerUpCosts';
import { halfLevels } from './levels';
import type { Cost, Modifiers } from './types';

export const ZERO_COST: Cost = { stardust: 0, candy: 0, xl: 0 };

const VARIANT_MULTIPLIER = { normal: 1, shadow: 1.2, purified: 0.9 } as const;

// Rounded up per power-up, which reproduces published Shadow/Purified totals.
function scale(cost: Cost, mods: Modifiers): Cost {
  const m = VARIANT_MULTIPLIER[mods.variant];
  const dust = m * (mods.lucky ? 0.5 : 1);
  return {
    stardust: Math.ceil(cost.stardust * dust - 1e-9),
    candy: Math.ceil(cost.candy * m - 1e-9),
    xl: Math.ceil(cost.xl * m - 1e-9),
  };
}

export function addCosts(a: Cost, b: Cost): Cost {
  return { stardust: a.stardust + b.stardust, candy: a.candy + b.candy, xl: a.xl + b.xl };
}

export interface PowerUpRange {
  from: number;
  to: number;
  mods: Modifiers;
}

export function powerUpCost({ from, to, mods }: PowerUpRange): Cost {
  if (to <= from) return ZERO_COST;
  return halfLevels(from, to - 0.5)
    .map((level) => scale(stepCost(level), mods))
    .reduce(addCosts, ZERO_COST);
}

export interface SecondMoveInput {
  dust: number;
  mods: Modifiers;
}

// Candy cost tiers: 10k → 25, otherwise Stardust / 1000 (50k → 50, 75k → 75, 100k → 100).
export function secondMoveCost({ dust, mods }: SecondMoveInput): Cost {
  const candy = dust === 10000 ? 25 : dust / 1000;
  const m = VARIANT_MULTIPLIER[mods.variant];
  return { stardust: Math.ceil(dust * m - 1e-9), candy: Math.ceil(candy * m - 1e-9), xl: 0 };
}

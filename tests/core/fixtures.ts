import type { Candidate } from '../../src/core/goals';

export const azumarill = { atk: 112, def: 152, hp: 225 };

export function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    base: azumarill,
    ivs: { atk: 4, def: 15, hp: 13 },
    level: 20,
    mods: { variant: 'normal', lucky: false },
    bestBuddy: false,
    secondMoveUnlocked: true,
    secondMoveDust: 50000,
    evolveCandy: 0,
    ...overrides,
  };
}

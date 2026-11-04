// Purify cost by the species' second-move Stardust cost (ADR 0005). Read from in-game
// purify screens covering all four tiers; a purify screenshot that disagrees wins.
export interface PurifyCost {
  stardust: number;
  candy: number;
}

const BY_SECOND_MOVE: ReadonlyMap<number, PurifyCost> = new Map([
  [10000, { stardust: 1000, candy: 1 }],
  [50000, { stardust: 3000, candy: 3 }],
  [75000, { stardust: 5000, candy: 5 }],
  [100000, { stardust: 20000, candy: 20 }],
]);

/** The purify cost for a species, or null when its tier is unknown. */
export function purifyCost(secondMoveDust: number | null): PurifyCost | null {
  if (secondMoveDust === null) return null;
  return BY_SECOND_MOVE.get(secondMoveDust) ?? null;
}

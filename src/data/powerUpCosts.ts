import type { Cost } from '../core/types';

// Cost of one power-up starting at a level, for the bracket beginning at `from`.
// Verified by tests against published totals; see docs/adr/0002-game-data-source.md.
const BRACKETS: ReadonlyArray<readonly [from: number, stardust: number, candy: number, xl: number]> = [
  [1, 200, 1, 0], [3, 400, 1, 0], [5, 600, 1, 0], [7, 800, 1, 0], [9, 1000, 1, 0],
  [11, 1300, 2, 0], [13, 1600, 2, 0], [15, 1900, 2, 0], [17, 2200, 2, 0], [19, 2500, 2, 0],
  [21, 3000, 3, 0], [23, 3500, 3, 0], [25, 4000, 3, 0], [26, 4000, 4, 0], [27, 4500, 4, 0],
  [29, 5000, 4, 0], [31, 6000, 6, 0], [33, 7000, 8, 0], [35, 8000, 10, 0], [37, 9000, 12, 0],
  [39, 10000, 15, 0], [40, 10000, 0, 10], [41, 11000, 0, 10], [42, 11000, 0, 12],
  [43, 12000, 0, 12], [44, 12000, 0, 15], [45, 13000, 0, 15], [46, 13000, 0, 17],
  [47, 14000, 0, 17], [48, 14000, 0, 20], [49, 15000, 0, 20],
];

export const MAX_POWER_UP_LEVEL = 50;

export function stepCost(level: number): Cost {
  if (level < 1 || level >= MAX_POWER_UP_LEVEL) {
    throw new RangeError(`No power-up from level ${level}`);
  }
  const bracket = BRACKETS.findLast(([from]) => from <= level)!;
  return { stardust: bracket[1], candy: bracket[2], xl: bracket[3] };
}

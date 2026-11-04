# 0003 - Verdict rules: compare remaining cost and value at goal

**Status:** proposed
**Date:** 2026-11-03
**Spec:** N/A
**Deciders:** project owner, Claude

## Context

Players over-value resources already spent. The tool must recommend per goal whether to
keep powering up the current Pokémon or switch to another of the same line.

## Decision

- Sunk cost is ignored. Each candidate is scored on the **remaining** cost to its goal
  level (power-ups + second charged move if locked + Candy to evolve).
- Goal value: Great (1,500) / Ultra (2,500) League = stat product at the highest level
  under the cap (max power-up level 50, +1 effective for Best Buddy); Master League =
  stat product at 50 (+1); Raids & gym attack = Attack stat at 50 (+1), ×1.2 if Shadow.
- A candidate already above a league cap is ineligible for that league.
- Verdict, with a 1% value threshold:
  1. Neither eligible → `neither`. Only one eligible → that one.
  2. Alternative better by >1% → `switch` if affordable, else `save` (stop spending on the
     current one and save for the alternative).
  3. Current better by >1% → `keep`.
  4. Within 1% → the cheaper one (fewer XL Candy, then less Stardust); ties → `keep`.
- Both candidates draw on the same Candy/XL pool because they share a family.

## Consequences

- Stat product is a proxy; breakpoints against meta opponents can beat it and are phase 2.
- The 1% threshold reflects that rank 1 vs rank ~100 is usually under 1% of stat product.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Value-per-Stardust ratio | Single number | Rewards cheap but weak picks | Misleads on goals |
| Pure rank comparison | Familiar | Ignores cost and affordability | Misses the actual question |

## Links

- Supersedes: N/A
- Related: 0001, 0002

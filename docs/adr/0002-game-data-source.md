# 0002 - Game data from PvPoke game master, cost tables hand-maintained

**Status:** superseded by 0005
**Date:** 2026-11-03
**Spec:** N/A
**Deciders:** project owner, Claude

## Context

Comparisons need species base stats, evolution families, second-move unlock costs, the
CP multiplier (CPM) per level, and Stardust/Candy/XL power-up costs. Moves change every
season (e.g. GO Battle League: Forever Forward, June 2026), so data must be refreshable.

## Decision

- Species data: generated from PvPoke's `src/data/gamemaster.json` (MIT) by
  `npm run update-data` into `src/data/species.json` (base stats, family, parent,
  second-move Stardust cost). Shadow and Mega entries are dropped; Shadow is a flag.
- CPM table: copied from PvPoke `Pokemon.js` (levels 1–55 in half steps).
- Power-up costs: hand-entered in `src/data/powerUpCosts.ts`, verified by tests against
  published totals (1→40: 270,000 Stardust / 304 Candy; 40→50: 250,000 / 296 XL).
- Modifiers: Shadow ×1.2, Purified ×0.9 on Stardust, Candy and XL; Lucky ×0.5 Stardust;
  rounded up per power-up (matches published Shadow 360 XL / Purified 272 XL totals).
- Evolution Candy cost is entered by the user (not present in the source data).

## Consequences

- Refreshing data is one command; moves are not used yet (breakpoints are phase 2).
- Shadow/Purified second-move cost multipliers are assumed to match power-up multipliers;
  verify in game.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Fetch game master at runtime | Always fresh | 1.7 MB download, third-party uptime | Slow on phones |
| PokeMiners raw game master | Authoritative costs and CPM | Large, raw protobuf-style JSON | More parsing for little gain now |

## Links

- Supersedes: N/A
- Related: 0001, 0003

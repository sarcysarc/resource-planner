# 0005 - Data pipeline v2: PvPoke only, plus a small purify table we keep ourselves

**Status:** accepted (amended by 0007: PvE move stats from PokeMiners, credited)
**Date:** 2026-11-03
**Spec:** [roadmap](../roadmap.md) G3, F2, F3
**Deciders:** project owner, Claude

## Context

The roadmap planned G3 as a merge of two sources: PvPoke's game master (MIT) and
Niantic's game master as published by PokeMiners, which has the two values PvPoke
lacks: the Candy cost to evolve (F2) and the cost to purify a Shadow (F3).

The PokeMiners repository has no licence. Its README says it is for educational use
only and that all content belongs to The Pokémon Company and Niantic. No one grants
permission to redistribute it, and our build ships its output inside a public site.

Meanwhile the app became screenshot-first (`docs/design/screenshot-first.md`). S2
already reads the evolve cost from a Pokémon screen, so F2 no longer needs a data file.

## Decision

- **One downloaded source: PvPoke.** The build becomes `scripts/build-species.ts`, run
  by Node directly (type stripping). It keeps what it had and adds each species'
  types. Move lists per species and move stats from PvPoke's `moves.json` (also MIT)
  come with G5, the first code that uses them, as a separate file loaded only when
  needed, so the main bundle does not carry them before then.
- **One schema, checked by Zod.** `src/data/pvpoke.ts` holds the schema and the
  transform from PvPoke's file, shared by the build and the app. The built file carries
  a `schemaVersion` and its source timestamp. The build checks its output against the
  schema before writing, and the app parses it again at load.
- **Purify cost from the second-move tier.** A four-row table in `src/data/` maps a
  species' second-move Stardust cost (already in `species.json`) to its purify cost:

  | Second move | Purify |
  |-------------|--------|
  | 10,000 | 1,000 Stardust, 1 Candy |
  | 50,000 | 3,000 Stardust, 3 Candy |
  | 75,000 | 5,000 Stardust, 5 Candy |
  | 100,000 | 20,000 Stardust, 20 Candy |

  Read from the purify screens of nine Shadows on 2026-11-03, covering all four
  tiers (including two legendaries). It is a pattern we observed, not one the game
  publishes, so a purify screenshot that disagrees with the table wins.
- **Evolve Candy is not a data file.** It comes from the screenshot (S2) or the user
  types it. F2 becomes: keep the value read from a screenshot for that species while
  the page is open, so it is not asked for twice.
  *Amended by ADR 0019 (proposed):* evolve costs come from PokeMiners, credited; what a
  screenshot shows or the player types still wins.
- **No PokeMiners data** is downloaded, copied or used to derive values.
- Refreshing stays one command (`npm run update-data`). A scheduled CI job may run it
  later (G1).

## Consequences

- No dependency on an unlicensed file. PvPoke's MIT licence covers what we download.
- The purify table is ours to keep correct. It is four rows that rarely change, but
  an event that changes purify prices needs a manual edit, and a species priced
  apart from its tier would be wrong until someone notices.
- Players without a screenshot still type the evolve cost, as today.
- A species with no second-move cost, or a cost outside the four tiers, has no
  known purify cost. F3 then asks for it instead of guessing. Tests cover that case.
- 0002's note "evolution Candy cost is entered by the user" stays true, now with
  screenshot reading in front of it.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| PokeMiners game master (the roadmap's plan) | Exact evolve and purify costs for every species | No licence; "educational use only" | We cannot rely on permission we were never given |
| pokemongo-json-pokedex (Apache-2.0) | Licensed | Archived in 2019, years out of date | Wrong data is worse than none |
| Hand-kept evolve Candy table for every species | F2 works without a screenshot | Hundreds of entries to keep correct | Screenshots already give the value |
| Ask the user for purify cost too | No table at all | One more field for a value that barely varies | F3 should need no extra typing |
| Purify cost by species class (legendary, mythical tags) | Tags are in PvPoke | Nine screens showed four prices, not two; Axew and Snorlax cost more than Carvanha | Does not match the game |

## Links

- Supersedes: 0002
- Related: 0004, 0006 (options model, F3), 0007 (battle math, F4/F5), 0008, 0009

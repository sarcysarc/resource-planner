# 0005 - Data pipeline v2: PvPoke, plus PokeMiners' game master, credited

**Status:** accepted (amended by 0007: PvE move stats from PokeMiners, credited; amended
2026-11-08: PokeMiners accepted as a credited source, see the amendment below)
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
- ~~**Purify cost from the second-move tier.**~~ *Superseded by the 2026-11-08 amendment:*
  purify costs come per species from PokeMiners, credited. Checked against the game data,
  the table priced 97 species wrongly (Charmander, Timburr, Throh and Sawk among them).
  The original decision follows. A four-row table in `src/data/` maps a
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
- ~~**Evolve Candy is not a data file.**~~ *Superseded by ADR 0019:* evolve costs come
  from PokeMiners, credited; what a screenshot shows or the player types still wins.
- ~~**No PokeMiners data** is downloaded, copied or used to derive values.~~
  *Superseded by the amendment below.*
- Refreshing stays one command (`npm run update-data`). A scheduled CI job may run it
  later (G1).

## Amendment (2026-11-08): PokeMiners accepted, credited

ADR 0007 took PvE move stats from PokeMiners, and ADR 0019 evolve costs. Each time the
reasoning was the same: PvPoke's MIT data comes from the same game master, so a licence
on a copy never covered Niantic's numbers, and taking only the facts we need, with
credit, is what PvPoke and DialgaDex already do. The owner accepts that as the rule,
not as one exception per file.

- **PokeMiners' game master is a second source**, beside PvPoke. The build downloads it
  once (`PVE_SOURCE_URL`) and keeps only the fields a feature uses, each in its own small
  file with a Zod schema, so nothing else from it ships.
- **Credit.** The app's data line names PokeMiners for each kind of value it gives, and
  says the game data belongs to Niantic and The Pokémon Company.
- **What the player shows or types wins.** A screenshot or a typed value overrides the
  data while the page is open, so a change the weekly refresh (ADR 0013) has not picked
  up yet does not block anyone.
- **PvPoke stays the source** for species, stats, move lists, PvP move stats and
  rankings. PokeMiners is used where PvPoke has no value, or where ours is a table we
  keep by hand and the game master has the real one.
- **Each new use still gets an ADR** (or an amendment) naming the fields taken, how
  they are matched to PvPoke's ids, and what happens when one is missing.
- **Not allowed:** extracting the game master from the app ourselves (Niantic's terms;
  it puts the player's account at risk), and shipping the whole file.
- **First use under this amendment: purify costs.** `src/data/purify.json` keeps, per
  species, `shadow.purificationStardustNeeded` and `purificationCandyNeeded` from the
  species' own form template (Alolan Rattata's, spelt `RATTATA_ALOLA`), else its plain
  one. A species with no `shadow` there has no price; the app leaves purifying out with
  a note. On 2026-11-08, 518 of 1,073 species have a price, in five tiers, including
  5,000 Stardust and 1 Candy for Throh and Sawk, which no second-move tier gave.

## Consequences

- ~~No dependency on an unlicensed file.~~ Since the amendment, the build depends on
  PokeMiners staying available and current; ADR 0007's mirror setting covers that.
- ~~The purify table is ours to keep correct.~~ Since the amendment, purify costs are
  rebuilt from PokeMiners with the rest of `src/data`, so an event that changes them is
  picked up by the weekly refresh.
- Players without a screenshot still type the evolve cost, as today.
- A species with no purify price in the game data (no Shadow form there, such as
  Azumarill on 2026-11-08) has no known purify cost. F3 then leaves purifying out with a
  note instead of guessing. Tests cover that case.
- 0002's note "evolution Candy cost is entered by the user" stays true, now with
  screenshot reading in front of it.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| PokeMiners game master (the roadmap's plan) | Exact evolve and purify costs for every species | No licence; "educational use only" | Turned down in 2026-11-03; accepted, credited, by the 2026-11-08 amendment |
| pokemongo-json-pokedex (Apache-2.0) | Licensed | Archived in 2019, years out of date | Wrong data is worse than none |
| Hand-kept evolve Candy table for every species | F2 works without a screenshot | Hundreds of entries to keep correct | Screenshots already give the value |
| Ask the user for purify cost too | No table at all | One more field for a value that barely varies | F3 should need no extra typing |
| Purify cost by species class (legendary, mythical tags) | Tags are in PvPoke | Nine screens showed four prices, not two; Axew and Snorlax cost more than Carvanha | Does not match the game |

## Links

- Supersedes: 0002
- Amended by: 0007 (PvE move stats), 0019 (evolve Candy), the 2026-11-08 amendment
- Related: 0004, 0006 (options model, F3), 0008, 0009

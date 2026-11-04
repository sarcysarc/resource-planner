# 0007 - Battle math: formulas, move data and meta opponents

**Status:** accepted
**Date:** 2026-11-04
**Spec:** [roadmap](../roadmap.md) G5, F4, F5
**Deciders:** project owner, Claude

## Context

F4 (raid value from moves) and F5 (PvP opponent breakpoints) both need damage
numbers: the type chart, STAB, the Shadow multipliers, the damage formula and each
move's stats. G5 builds this once in `src/core`, next to `stats.ts`, reusing the CPM
table.

PvPoke's game master (MIT, ADR 0005) already has each species' fast and charged
move lists and 355 moves with their PvP stats (power, energy, turns). It has no PvE
(raid and gym) move stats: its Bubble is power 8 over 3 turns, the PvP values. No
source with PvE stats carries a licence (PokeMiners, pokemon-go-api and pogodata
have none), and ADR 0005 already turned down unlicensed data.

PvPoke also publishes per-league rankings (MIT). Each league file is about 1.2 MB
with 1,154 entries, each with its recommended moveset.

## Decision

- **Formula (PvP and PvE).**
  `damage = floor(0.5 × power × (attack ÷ defence) × STAB × effectiveness × bonus) + 1`.
  Attack and defence are battle stats (base + IV) × CPM. STAB is 1.2. Effectiveness
  multiplies 1.6 per weakness, 0.625 per resistance and 0.390625 per double
  resistance (immunity). The PvP bonus is 1.3; PvE has none. Weather, friendship
  and charged-move minigame scores are left out.
- **Shadow.** Attack ×1.2 and defence ×0.8333333 (the game master's values) when
  dealing and taking damage. This replaces the stat-product shortcut noted in
  ADR 0006.
- **Type chart.** 18 types as a small table we keep in `src/data/types.ts`. It is
  public game mechanics and does not change.
- **Moves.** The species build (ADR 0005, schema v3) adds each species' fast and
  charged move ids. A separate `moves.json` holds each move's PvP stats from PvPoke
  and its PvE stats (below). PvPoke's species lists leave out Frustration and Return,
  so `chargedMoves()` adds Frustration for a Shadow and Return for a Purified.
- **Meta opponents (F5).** The build keeps the top 30 of each league's PvPoke
  ranking, with species id and recommended moveset, in one small file per league.
  The app loads a league's file only when F5 needs it, so the main bundle stays the
  same size.
  *Amended by ADR 0012:* all three leagues share one `pvp.json`, about 14 KB gzipped.
- **PvE move stats (F4): PokeMiners, credited.** The build downloads PokeMiners'
  `latest/latest.json` (about 19 MB) and keeps, per move, only the PvE power,
  duration and energy (`moveSettings`: `power`, `durationMs`, `energyDelta`), in a
  `moves.json` (57 KB, 8 KB gzipped, with the PvP stats). Nothing else from that file
  ships. Fast moves are matched to PvPoke's ids by dropping the `_FAST` suffix; every
  PvPoke Hidden Power maps to the one PvE Hidden Power, and a short alias table covers
  ids spelt differently (Future Sight, Pyro Ball, Techno Blast Douse). A move with no
  PvE entry (24 of 355: the `_PLUS` variants, Gulp Missile and Aegislash forms and a
  few others) is marked unknown, and F4 says so instead of guessing. The app's data
  line and the docs credit PokeMiners alongside PvPoke, and say the game data belongs
  to Niantic and The Pokémon Company.
- **Freshness.** PokeMiners last updated on 2026-08-29. A mirror in the same format,
  `alexelgt/game_masters`, updates every few days and is what `pokemon-go-api`
  reads. The build takes the source URL as a setting (`PVE_SOURCE_URL`), so it can switch to the mirror
  (and credit it) if PokeMiners falls behind a move rebalance.

## PvE move stats: sources searched

Sources searched (2026-11-04). Every current source of PvE move stats (power,
duration, energy) is a copy of the game's own game master, extracted by PokeMiners:

| Source | Licence | Current? | Notes |
|--------|---------|----------|-------|
| PokeMiners `game_masters` | none | yes | The original extraction; 2 releases a week or so |
| `pokemon-go-api` | none | yes | Built from a PokeMiners mirror; says the data belongs to Niantic and TPC |
| `mgrann03/pokemon-resources` (DialgaDex data) | none | yes | Slim move JSON from PokeMiners; DialgaDex's code is GPL-3.0, its data repo has no licence |
| `pokemongo-dev-contrib/pokemongo-game-master` | MIT | no, April 2022 | 99 of 364 current moves missing and 217 with different stats since the 2024 rebalance |
| PokeAPI | BSD-3 | yes | Main-series games only, no Pokémon GO stats |

PvPoke's MIT data comes from the same game master; its licence covers PvPoke's
work, not Niantic's numbers. So no fresh source has PvE stats under a licence.

| Option | Pros | Cons |
|--------|------|------|
| A. Approximate raid damage with PvP move stats (damage per turn) | No new data; licensed | Not the real raid DPS; some moves rank differently in raids |
| B. Our own small PvE table for the moves top raid attackers use (about 60) | Real raid numbers; we own it | The game shows power but not duration or energy, so those still come from somewhere; upkeep when moves change |
| C. Leave F4 out; raids keep Attack with the Shadow bonus | Nothing to maintain | F4 does not happen |
| D. Read PvE move stats from PokeMiners at build time, keeping only power, duration and energy per move, with attribution | Exact and current; the same upstream PvPoke uses | No licence; reverses ADR 0005's rule for this one file |

**Chosen: D** (project owner, 2026-11-04). PvPoke's numbers come from the same game
master, so the licence on a copy never covered Niantic's numbers. Using only the
facts we need, with credit, is what PvPoke and DialgaDex already do. Extracting the
file from the app ourselves was ruled out: it gives the same data and breaks Niantic's
terms, putting the player's account at risk.

## Consequences

- `goals.ts` gains a move-aware value for raids (F4) and per-opponent results for
  PvP (F5). G4's `basis` gets new kinds, and the verdict is unchanged.
- The species file grows by the move ids: 186 KB to 303 KB, or 31 KB to 50 KB
  gzipped. Moves and rankings are separate files, loaded only by F4 and F5.
- The app's data line gains the PokeMiners credit with F4, when the app first loads
  `moves.json`.
- A scheduled data rebuild (G1) keeps moves and rankings current.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Keep move lists out of the species file, in a lazy file | Main bundle unchanged | A second lookup by species | 20 KB gzipped is small next to the OCR assets |
| Ship whole PvPoke ranking files | No trimming | 1.2 MB per league | Only the top opponents matter for breakpoints |
| Full battle simulation (shields, energy timing) | Closest to real battles | Large and slow; PvPoke already does it | Breakpoints need damage per hit, not whole battles |

## Links

- Amends: 0005 (one unlicensed source, PokeMiners, for PvE move stats only)
- Related: 0006 (options model and value basis)

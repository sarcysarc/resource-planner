# 0012 - PvP matchups against meta opponents (F5)

**Status:** accepted
**Date:** 2026-11-04
**Spec:** [roadmap](../roadmap.md) F5
**Deciders:** project owner, Claude

## Context

League verdicts compare stat product (ADR 0006). Players also want to know whether
a better-IV or Shadow option changes real matchups: does it deal more damage per
fast move to the opponents it will meet (a breakpoint), or take less from theirs (a
bulkpoint)? G5 (ADR 0007) gives PvP damage per hit and PvP move stats; PvPoke's
league rankings give the meta and each species' recommended moveset.

## Decision

- **Shown, not scored** (project owner, 2026-11-04). League verdicts stay on stat
  product. Each league result adds a line comparing the option with the current one
  against the top 30 opponents, with a per-opponent list behind a toggle.
- **Measure.** For each opponent: damage per fast move the candidate deals, and
  damage per fast move it takes, with the PvP formula (ADR 0007) at the goal's
  effective level. An option "deals more" to an opponent when its damage is higher
  than the current one's, and "takes less" when the damage it takes is lower.
- **Opponents.** The top 30 of PvPoke's overall ranking for each league, each with
  its recommended fast move and PvPoke's default level and IVs for that league
  (`defaultIVs`; Master League uses level 50 with 15/15/15, as PvPoke does). A
  `_shadow` id is the base species as a Shadow.
- **Candidate's fast move: PvPoke's pick, with override** (project owner,
  2026-11-04). By default each league uses the fast move PvPoke recommends for the
  target species in that league (its Shadow entry for a Shadow). If the species is
  unranked, the fast move with the most damage per turn, with STAB. Each candidate
  has an optional "PvP fast move" picker; a picked move is used in every league.
- **Data.** The build writes one `pvp.json` with, per league, the 30 opponents and
  every ranked species' recommended fast move. It is loaded once as its own chunk,
  like `moves.json` (ADR 0011). This amends ADR 0007's "one file per league": the
  three leagues together are small enough that one file is simpler.

## Consequences

- `Candidate` gains `pvpMoves` (its types and fast move per league), carried for the
  matchup view only; `goals.ts` and the verdict ignore it.
- `src/core/matchups.ts` holds the per-opponent sums; the UI renders them.
- The data rebuild downloads three ranking files (about 1.2 MB, 0.9 MB and 0.4 MB)
  and keeps a few kilobytes of each.
- Charged moves, shields and energy are left out: per-hit damage is what players
  mean by breakpoints and bulkpoints. A full battle simulation is a later choice.

## Alternatives Considered

| Option | Pros | Cons | Why not |
|--------|------|------|---------|
| Matchups decide ties | Uses the extra signal | Hides why a verdict flipped | Owner chose shown, not scored |
| Replace stat product | Closer to real battles | Large change to ADR 0003/0006; per-hit damage is a partial view | Too much weight on a partial measure |
| PvPoke's pick only, no picker | Simpler | Wrong when the Pokémon lacks that move | Owner chose an override |
| One file per league | Loads only one league | Three loads, three schemas to wire | Together they are small |

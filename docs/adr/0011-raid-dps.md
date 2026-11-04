# 0011 - Raid value from moves (F4)

**Status:** accepted
**Date:** 2026-11-04
**Spec:** [roadmap](../roadmap.md) F4
**Deciders:** project owner, Claude

## Context

The raid goal values a candidate by its Attack, ×1.2 for a Shadow (ADR 0006). Two
candidates with the same Attack but different moves are not worth the same in
raids, and a Purified one gains Return. G5 (ADR 0007) gives damage per hit and PvE
move stats, so the raid value can be damage per second instead.

## Decision

- **Value.** Raid value is damage per second (DPS) at the goal's target level, with
  basis `raidDps`. The 1% tie and cheaper-wins rules (ADR 0006) are unchanged.
- **Cycle.** One cycle is `n` fast moves, enough to fill the charged move's energy
  (`n = ceil(charged energy ÷ fast energy)`), then the charged move:
  `DPS = (n × fast damage + charged damage) ÷ (n × fast duration + charged duration)`.
  Energy from damage taken, dodging and the move's damage window are left out.
- **Target.** A neutral target (no type effectiveness) with defence 170, about a
  tier-5 boss. STAB and the Shadow multipliers apply (ADR 0007).
- **Moves: best, with override** (project owner, 2026-11-04). By default the
  candidate is valued with its best fast and charged pair, from the target species'
  lists, plus Return for a Purified and Frustration for a Shadow. Each candidate has an
  optional fast and charged move picker; a picked move replaces "best" on that side.
  Moves without PvE stats are skipped. The result names the moves used.
- **One charged move.** The cycle uses one charged move; with a second one unlocked,
  the better of the two is the one used, which is what "best" already picks.
- **Data.** `moves.json` is loaded once when the app starts, as its own chunk, and
  the data line credits PokeMiners. `src/core` stays free of data imports: the
  candidate carries its types and its possible fast and charged moves.
- **Fallback.** When no pair has PvE stats or the moves file fails to load, the raid
  goal keeps the Attack value and says so.

## Consequences

- `Candidate` gains `types` and `raidMoves`; `ValueBasis` gains `raidDps`.
- The best pair may use an elite or legacy move the Pokémon does not have; the
  result names it, and the picker corrects it.
- Moves change on evolution, so the pickers list the target species' moves.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Moves must be picked | Exact | More typing; raid empty until done | Owner chose best with override |
| Best moveset only | No typing | Wrong for a Pokémon without elite moves | Owner chose best with override |
| Full simulation (energy from damage, boss attacks, dodges) | Closer to Pokebattler | Much larger; needs boss data | Comparing two of one family needs ranking, not exact times |
| Damage per second × time to faint (TDO, or DPS³×TDO) | Values bulk too | Needs a boss's attacks | Kept for later if wanted |

## Links

- Related: 0006 (options model, value basis), 0007 (battle math, move data)

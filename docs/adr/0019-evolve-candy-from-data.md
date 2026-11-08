# 0019 - Candy to evolve from data, typed once where data has none

**Status:** accepted
**Date:** 2026-11-08
**Spec:** [roadmap](../roadmap.md) F2; found in use on 2026-11-08 (a Pikachu line)
**Deciders:** project owner, Claude

## Context

A player uploaded the appraisals of three Pikachu, typed the Candy to evolve into one
tile and tapped Compare. Compare opened the next Pikachu and asked for the same thing
with nearly the same message, so the typed value looked lost. Uploading a Pokémon screen
(with its EVOLVE button) fixed it, because only a screenshot teaches the cost.

The causes, both from ADR 0005 (F2):

1. **Evolve costs are not data.** ADR 0005 left them out because the only full source,
   PokeMiners' game master, has no licence. So every species' cost had to come from a
   screenshot or be typed.
2. **A typed cost stays in its tile.** `wireEvolve` learns a cost only from a screenshot
   with an EVOLVE button, so the other tiles of the same species stay empty.

Compare already opens the tile it stops on (`runCompare`'s `fail`), so the error shows
in the right place. The problem is that every tile asks.

Since then, ADR 0007 started reading PvE move stats from PokeMiners, credited. The build
already downloads that file. Each species' template there has `evolutionBranch`, with
the species it evolves into, that species' form and the `candyCost` of the step. Matched
against our species on 2026-11-08, 504 of the 513 evolutions in `species.json` get a
cost, each one 12, 25, 50, 100, 200 or 400. Some parents' plain templates have no branch
while each of their forms does (Deerling's seasons); those use the forms'. The 9 left
have no Candy cost (Gholdengo, Wyrdeer, Kleavor), a parent PvPoke does not list as a
species (Vivillon, Solgaleo, Lunala, so no tile can start there) or a parent in PvPoke's
data that does not match the game (Carkol, Coalossal, Poltchageist).

## Decision

- **Evolve costs are data, from PokeMiners, credited.** The build reads, for each species
  with a parent, the cost of evolving into it: from the parent's template for its form
  (Galarian Zigzagoon's, not Zigzagoon's), the branch whose evolution is that species,
  or any of the parent's forms' when its own template has none.
  If that template gives two costs for the same species, the branch whose form matches
  decides; if none does, that species has no cost. Only the cost is kept, in
  `src/data/evolve.json` (species id to the undiscounted cost of evolving into it). The
  app's data line credits PokeMiners for it, as it does for raid move stats. This amends
  ADR 0005's "Evolve Candy is not a data file" and its "No PokeMiners data", as ADR 0007
  did for move stats.
- **What the player shows or types wins over the data.** A cost read from an EVOLVE
  button, or typed, replaces the data's for that step while the page is open. The data
  can be out of date after a change the weekly refresh (ADR 0013) has not picked up yet.
- **A typed Candy to evolve teaches its step.** When the player types a total in a tile
  and exactly one step from that tile's form to the target has no cost from data, a
  screenshot or earlier typing, the memory learns that step's cost: the typed total
  minus the known steps, undone for the Purified discount. It is learned only when the
  result is one of the game's costs; any other number stays in its own tile. Every tile
  of the line is then refilled, and so is every tile read later.
- **A typed total wins in its own tile.** Refilling the other tiles never overwrites a
  total the player typed there.

## Consequences

- With the data, the Pikachu line fills by itself: no screenshot and no typing.
- One more field from an unlicensed source. Like the move stats, it is a game fact taken
  with credit; the reasoning of ADR 0007 applies.
- `evolve.json` is rebuilt by `npm run update-data` and the weekly refresh, which already
  commits all of `src/data`.
- Species with no cost in the data still need a screenshot or typing, once per visit.
- A wrong typed cost spreads to the other tiles of that step. Typing again corrects it.
- Tests: the build picks the form's template and leaves out what it cannot match; the app
  fills a line's tiles from the data, with the Purified discount; a typed cost fills the
  other tiles and later ones, stays in its own tile, and is not learned when it is not a
  game cost.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Keep evolve costs out of the data; save typed costs with the book | No new data source | Every species still asked for once per player | The costs are fixed and the file is already downloaded |
| A table we keep by hand | Ours | About 500 rows to keep correct | ADR 0005 turned this down; PokeMiners keeps it current |
| Add the cost to `species.json` | One file | Mixes a PokeMiners field into PvPoke's species file and its schema | Keeping each source's data apart keeps the credit clear |
| A shared "Candy to evolve" field per line | One place to type | Pichu and Pikachu need different totals; Purified ones need less | Totals differ by form and variant |

## Links

- Amends: 0005 (evolve Candy becomes data, from PokeMiners)
- Related: 0007 (PokeMiners credited for PvE move stats), 0013 (weekly refresh), 0015, 0017

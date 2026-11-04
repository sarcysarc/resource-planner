# 0015 - Compare a grid of Pokémon from one line, read from appraisals

**Status:** accepted
**Date:** 2026-11-04
**Spec:** [screenshot-first design](../design/screenshot-first.md), "What the player does"
**Deciders:** project owner, Claude

## Context

The planner compares exactly two Pokémon, Current and Alternative. Screenshots come in
two ways: a shared picker in step 1 that sorts them into the two cards (ADR 0014), and a
picker inside each card in step 2. In use this is confusing. After step 1 has read the
screenshots, the card's own picker still says "No file chosen", so nothing seems to
have carried over, and step 1 looks like a repeat of step 2.

It also doesn't match how players choose. A player usually has many of one line, say 10
Pokémon from the Bulbasaur line, and wants to know which one to power up. Today they
can only try them two at a time.

Two things already allow more than two:

- `groupReadings` sorts any number of screenshots into Pokémon (ADR 0008, 0009).
- `compare` takes a list of options, the current one first (ADR 0006).

What limits the app to two is the page.

## Decision

### Screenshots in, one place

- Step 1 is the only file picker. The per-Pokémon pickers in step 2 are removed.
  Shares (ADR 0010) land in step 1 too.
- The expected input is **one appraisal screenshot per Pokémon**. An appraisal shows
  the real species (its footer), CP, HP and exact IVs, which is enough to work out
  the level and rank the Pokémon. Any mix of screens is still accepted and grouped.
- Screenshots can be added later in step 1. New ones are grouped with the Pokémon
  already read, by species, CP and HP, as when they arrive together, and fill gaps
  without overwriting what the player has edited.
- **The IV bars mark an appraisal** (amended 2026-11-04). OCR can garble the footer
  and the HP line (seen on an iPhone JPEG: "caught en", no HP), but the bars are read
  from pixels and are reliable. A screenshot with bars is read as an appraisal even
  when its text gives no sign. Its CP band is trusted without an HP line only when
  the band also shows the CP label, and the number after the label wins: on a Lucky's
  gold background the band can hold junk digits too (seen: "384" above "cr2488").
- **An appraisal never joins a Pokémon by guesswork.** An appraisal without CP or HP
  was misread, so the time order used for scrolled-down screens doesn't apply. It
  joins only the single Pokémon of its own known family that has no IVs yet;
  otherwise it gets its own tile, which asks for what is missing. Before this, its
  IVs went to the Pokémon nearest in time, giving wrong IVs or an "IVs disagree"
  question.

### Questions before the grid

- If something can't be settled from the screenshots, step 1 asks before moving on.
  For example, a name that could be any stage of the line, or two screenshots that
  disagree.

### The grid

- Step 2 shows **one tile per Pokémon** with a thumbnail of its screenshot, its name,
  CP and IVs. The thumbnail is cropped to the top of the screen, so the appraisal
  footer (catch place and date) is never shown.
- The thumbnail and the screenshots stay on the device, as before (ADR 0008).
- One tile is marked **current** with its own control. The first tile is current
  until the player picks one.
- **Tapping a tile opens its details** (IVs, level or CP, Type, Lucky, Best Buddy,
  second move, evolve Candy, attacks) to check and edit. These are today's candidate
  fields, shown for one tile at a time.
- A tile that is missing something says what, and **names the screenshot that would
  fill it**. For example: "Add its Pokémon screen for Lucky and the Candy totals" or
  "Add the screen scrolled down for its moves and evolve Candy". A scrolled-down screen
  has no CP, so it is asked for together with the top screen: the pair finds its tile
  by CP, and same-family Pokémon with the same power-up cost are not mixed up.
- Values an appraisal can't give use the existing defaults (Normal, not Lucky, second
  move locked, best attacks) until a screenshot or the player sets them. The tile
  shows that they are defaults.
- An **"Add a Pokémon by hand"** tile opens empty details, for typing one in.
- **One shared target** for all tiles, chosen above the grid as now. In a branching
  line (Eevee, Gloom, Slowpoke) every tile is compared as that target; changing the
  target re-ranks them.
- The resources stay as they are, below the grid.

### Marking for transfer

- After a comparison, a tile that is **not the top pick for any kind of battle** is
  labelled **"Could transfer"**, with the reason (for example "Tile 2 is stronger in
  every league"). It is only a suggestion.
- The player can mark or unmark **Transfer** on any tile by hand. A manual mark always
  wins over the suggestion.
- Tiles marked Transfer are **left out of the comparison** and listed together below
  the grid, by name, CP and IVs, so the player knows which ones to transfer in the
  game. The planner never acts in the game.

### Saved on the device

- The grid is **saved on this device**: each tile's values, the player's edits, the
  current and Transfer marks, and the cropped thumbnail. It is still there on the
  next visit. Each tile also keeps the CP, HP and Candy family it was first read with,
  so a screenshot added on a later visit still finds its tile.
- It is stored only in this browser (IndexedDB) and never sent anywhere. Only the
  cropped thumbnail is kept, never the full screenshot, so the appraisal footer is
  never stored.
- A **"Clear all"** button empties the grid, clears the target and deletes everything
  saved, so the next screenshots start a new evolution line.

### Results: a ranked list

- The current tile is compared against every other tile, with their derived options
  (purified, ADR 0006).
- **For each kind of battle, the options are ranked.** First comes the verdict as now
  (ADR 0003 rules over the list): "Keep the current one" or "Switch to …". The
  runners-up follow, in order, each with how it compares to the current one and its
  cost.
- Tiles are named by name, CP and IVs, so the player can match them to the game.

## Consequences

- Reading, grouping and comparing stay as they are; the page and the form reading
  change. Reading the two fixed fieldsets becomes reading a list of tiles.
- One set of candidate fields is shown at a time instead of two, so step 2 gets
  shorter even with many Pokémon.
- Many screenshots at once means a longer read. The progress line stays, and tiles
  appear as they are read.
- Changes to ADR 0014: step 1 stays, but its picker is the only one; step 2 becomes the
  grid. The steps still appear as ADR 0014 says.
- Changes to the screenshot-first design: "the first two candidates go into Current
  and Alternative" becomes "every candidate becomes a tile".
- Results for 10 Pokémon with purified options can be 20 entries per battle. The
  ranked list shows the top few and folds the rest away.

- Saving thumbnails keeps small images of the player's game in the browser. They are
  cropped and stay on the device, and "Clear all" removes them.
- "Could transfer" can't know reasons outside the comparison, such as a Pokémon kept
  for trading or a collection. It is only ever a suggestion, and the player decides.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Keep two cards, drop the per-card pickers | Smallest change | Still two at a time | Doesn't fit choosing among many |
| Keep two cards, show thumbnails in each | Fixes "nothing carried over" | Still two at a time, still two pickers | Same |
| A table, one row per Pokémon with editable columns | Everything on one screen | Too wide for a phone; too many fields | The player chose tiles |
| Ask for 2–3 screenshots per Pokémon up front | Every value read | 20–30 screenshots for 10 Pokémon | The player wants appraisals first, extras only where they matter |

## Links

- Supersedes: parts of 0014 (the per-Pokémon pickers and step 2's two cards)
- Related: 0003, 0006, 0008, 0009, 0010, 0014, [screenshot-first design](../design/screenshot-first.md)

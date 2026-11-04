# 0017 - A grid per evolution line, from one batch of screenshots

**Status:** proposed
**Date:** 2026-11-04
**Deciders:** project owner, Claude

## Context

ADR 0015 holds one line per grid. The stress test (ADR 0016, cause D) showed what that
does in use: the first screenshot sets the target, and every Pokémon from another line
gets the target's form. Ten appraisals of ten lines came out as ten "Sandygast" tiles,
shared and picked alike, with nothing said.

Players don't sort their screenshots by line. The intended use is to screenshot a batch of
Pokémon (10–50 at a time) and share them all; each line then gets its own advice.

## Decision

### Lines

- Each Candy family read becomes a **line**, with its own grid, target, Candy totals,
  current tile and results. Stardust and the account values stay shared.
- **Target:** the line's final evolution. A branching line (Eevee, Gloom, Slowpoke) asks
  for its target in step 1. The player can change it in the line.
- **Current:** the first tile read, until the player picks one (as ADR 0015).
- A line with one Pokémon still gets advice: power up, purify, evolve toward the target,
  and the cost.
- Advice stays per line. Spending across lines is left for later.

### Step 2: a list of lines

- One row per line: name, number of Pokémon and the strongest call in any battle, e.g.
  "Magikarp line · 3 · Gyarados CP 2802: top for raids". Tapping a row opens its grid
  and results; one line is open at a time.
- **Order:** rows with a switch or power-up call first, then the rest by Pokédex number.
- Each line has its own Clear; Clear all stays.

### Step 1: reading a batch

- All questions are asked in step 1 before the lines appear, as today: branching
  targets, a name that could be any stage, screens that disagree, and the changed-CP
  question below.
- The status counts what was read: "Read 40 screenshots: 31 Pokémon in 12 lines,
  2 not Pokémon screens." Bag and profile screens still fill the shared values.

### Sharing again, without duplicates

- **Same file:** each tile keeps a fingerprint (a hash) of the screenshots it was read
  from, never the image. A file already read is skipped without OCR: "Skipped 3 already
  added."
- **Same Pokémon, another screenshot:** joins its tile by line, CP, HP and, when both
  have them, IVs. Two with the same CP and HP but different IVs are different Pokémon.
  Fills gaps and never overwrites the player's edits (as ADR 0015).
- **Powered up or evolved since:** same line and IVs, another CP. Step 1 asks once: "Is
  Gyarados CP 2950 (12/3/14) your Gyarados CP 2802, powered up?" Yes updates that tile;
  No adds a new one.
- **Look-alikes:** a screen without IVs that fits two tiles joins the first, and that
  tile notes it may be the other one. (New: today nothing is noted.)

### Saved on the device

- The saved record holds every line (target, Candy and tiles) and each tile's
  fingerprints. A saved one-line grid (version 1) is read as one line.

## Implementation notes

- **Slice 1 (2026-11-04): lines and the step 2 list.** The page keeps one grid. A book of
  lines is held in memory and saved (version 2: the open family and each line's target,
  tiles, Candy and XL Candy). Opening a line saves the open one into the book, empties the
  grid and restores the other's target, tiles and Candy; Stardust and the account values
  stay. Each Pokémon read goes to its family's line; one of no known family goes to the
  open line. A batch is put in line by line, and the first line read is open after it.
  Step 2 lists lines by Pokédex number, `Name line · count`, once there are two; the open
  one is marked. Not yet: row summaries and ordering by call, the final-evolution target
  and branching question, duplicates and fingerprints, per-line Clear.

## Order of work

1. Cause A (fake 0/0/0 from menus) and cause B (forms named "New Pokémon"), each with its
   own amendment and failing tests first.
2. This ADR, in slices: lines in the model and storage; the step 2 list; duplicates and
   the changed-CP question; ordering and row summaries.
3. Cause E (one OCR worker, the dark pass only when needed).

## Consequences

- Fixes cause D: no Pokémon takes another line's name.
- `applySpecies` no longer sets one page-wide target; each line has its own.
- The form, the results and the resources move inside a line. This is most of the page's
  wiring, so the work goes in slices, each releasable.
- Results are worked out only for the open line, so a batch of 12 lines costs no more
  to show than one.
- 50 thumbnails and fingerprints are kept in IndexedDB, about 1–2 MB.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Keep one line, list the rest as left out | Small change | The player re-shares per line | Doesn't fit sharing a batch |
| Keep one line, a "new grid" button per left-out line | No re-reading | Still one line at a time | Same |
| Every grid stacked on one page | Nothing to tap | Long page on a phone, slow with many lines | The player chose a list |
| Ask questions inside each line | Nothing blocks | Questions are easy to miss | The player chose step 1 |

## Links

- Amends: 0015 (one line per grid, the shared target), 0014 (step 2)
- Related: 0010 (share), 0016 (stress test, cause D)

# Roadmap

How the next features fit together, so shared groundwork is built once and not
once per feature. Each feature lists the groundwork it needs; groundwork comes
first in the order below.

## Features

| # | Feature | What the user gets | Needs groundwork |
|---|---------|--------------------|------------------|
| F1 | Host online | Open the planner on a phone from a link | G1 |
| F2 | Auto-fill evolve Candy | No typing the Candy cost to evolve | G2, G3 |
| F3 | Purify or keep Shadow | Compare a Shadow against its purified self (IVs +2, level at least 25, purify cost) | G2, G3, G4 |
| F4 | Raid value from moves | Raid verdict uses damage per second, not just Attack | G2, G3, G5 |
| F5 | Opponent breakpoints | For PvP, which meta opponents each candidate out-damages or outlasts | G2, G3, G4, G5 |
| F6 | Unknown IVs | Enter CP, HP and appraisal; see the possible IV spreads | G2, G6 |
| F7 | Fill from screenshot | Read CP, HP and appraisal from a screenshot | G6 (via F6) |

## Shared groundwork

**G1. CI and hosting.** GitHub Actions runs lint, types, tests and build on every
push and deploys `dist/` to GitHub Pages. Later, a scheduled job reruns the data
build (G3), so the data stays current without manual work.

**G2. One candidate fieldset, generated in code.** `index.html` currently repeats the
candidate fieldset twice. F3–F6 each add fields (moves, purify toggle, appraisal).
Building the fieldset from one template means each new field is added once. It also
allows more than two candidates (G4).

**G3. Data pipeline v2.** One build script and one versioned, Zod-checked schema
(ADR 0005):
- PvPoke `gamemaster.json` and `moves.json` (MIT): stats, family, second move cost,
  plus types, moves and legendary/mythical tags for F3–F5.
- A small table we keep ourselves: purification cost by second-move cost tier (F3).
- Evolution Candy (F2) is read from the Pokémon screenshot (S2) or typed, not shipped
  as data. PokeMiners' game master has no licence; ADR 0007 uses it, credited, for
  PvE move stats only, since no licensed source has them.

Rankings of meta opponents for F5 come from PvPoke's per-league ranking files. They
are split per league and loaded only when needed, so the main bundle stays small.

**G4. Options model.** Today `compare` takes exactly two candidates and one number
per goal. F3 adds a third option that does not exist yet (the purified version). F4
and F5 add new measures of value beyond stat product. Generalise once:
- compare N options, each a candidate plus optional transformations (evolve, purify)
- each goal produces a value plus a short explanation of where it came from
- the verdict picks the best option, using the same 1% tie and cheaper-wins rules

This amends ADR 0003.

**G5. Battle math.** Type chart, STAB, the damage formula (PvP and PvE variants) and
move stats. It sits in `src/core` next to `stats.ts` and reuses the CPM table. F4 and
F5 both use it, so it is written and tested once.

**G6. IV inference.** Given a species, CP, HP and optionally level, Stardust cost or
appraisal, list every IV spread and level that fits. It reuses `cp()`, `battleStats()`
and the power-up cost table. F6 is this with a form; F7 only adds OCR in front of it.

## Order

```
G1 ─► F1
G2 ─┬─────────────────────────────┐
G3 ─┼─► F2                        │
    └─► G4 ─► F3                  │
            └─► G5 ─► F4 ─► F5    │
G2 ─────────► G6 ─► F6 ─► F7 ◄────┘
```

Faster input is the top priority, so Phase D moves up to second. It needs only G2,
not the data pipeline.

1. **Phase A — foundation, small.** G1 + F1, then G2.
2. **Phase D — easier input.** Done. G6 + F6 (`src/core/infer.ts`, `src/ui/finder.ts`),
   then F7: CP, HP and Stardust from a Pokémon screen screenshot, and CP, HP and exact
   IVs from an appraisal screenshot (`src/core/screenText.ts`, `src/ocr/`, ADR 0008).
3. **Phase A, second half.** G3 + F2. G3 is done: `src/data/pvpoke.ts` (schema and
   transform, shared by the build and the app), types per species, and the purify table
   in `src/data/purify.ts`. F2 is done: each step's evolve cost read from a screenshot
   is kept while the page is open (`src/ui/evolveMemory.ts`), and "Candy to evolve" is
   filled with the total from the candidate's form to the target once every step on the
   way is known. Until then the status line names the step still missing.
4. **Phase B — more options.** G4, then F3. G4 is done: `compare` takes a list of
   candidates, current first; `decide` picks one option by the ADR 0006 rules; each goal
   result carries what its value measures and its cost split into parts, which the
   results table lists per option column. F3 is done: each Shadow candidate is
   followed by its purified self (`src/core/purify.ts`, `src/ui/options.ts`), priced at
   its current form's purify tier, and a verdict for it reads "Purify the current one"
   or "Save to purify the current one".
5. **Phase C — battle math.** G5, then F4, then F5. F5 is the largest feature: move
   choice per candidate, opponent list per league and a results view per opponent.
   G5 is done: damage per hit for PvP and PvE (`src/core/damage.ts`), the type chart
   (`src/data/types.ts`), species schema v3 with each species' move ids, and
   `src/data/moves.json` with PvP stats from PvPoke and PvE stats from PokeMiners
   (`src/data/moves.ts`, 24 of 355 moves without PvE stats). `chargedMoves()` adds
   Frustration and Return. Meta opponent files wait for F5.
   F4 is done (ADR 0011): raids are valued by the damage per second of the species'
   best fast and charged pair against a neutral target (`src/core/raid.ts`), with
   optional move pickers per candidate and the moves named in the result. The moves
   load as their own chunk (`src/ui/moves.ts`) and the data line credits PokeMiners.

## Decisions to record

| ADR | Decision | When |
|-----|----------|------|
| 0004 | Hosting on GitHub Pages, CI on GitHub Actions | Before G1 |
| 0005 | Data pipeline v2: PvPoke plus our own purify table (supersedes 0002) | Before G3 |
| 0006 | Options model and per-goal explanations (amends 0003, accepted) | Before G4 |
| 0007 | Battle math formulas, move data (PvE from PokeMiners, credited) and meta opponents (accepted) | Before G5 |
| 0008 | Screenshot reading runs on the device, nothing uploaded | Before F7 |
| 0009 | Read screens by their labels, not by position (accepted) | Before screenshot-first S1 |
| 0011 | Raid value from the best moveset's damage per second, with an override (accepted) | Before F4 |

## Next: screenshot-first input

Screenshots become the main way in: species, variant, Lucky, second move, costs
and resource totals all read from screenshots, with several screenshots at once.
Design: `docs/design/screenshot-first.md` (phases S1–S7). All seven are done:
word boxes, the screen classifier, the CP/HP/Stardust readers; species, Shadow/Purified/Lucky,
second move and evolve cost; the Stardust, Candy and XL totals; and several screenshots at
once, sorted into Pokémon with disagreements asked about; Rare Candy from the bag and the trainer
level from the profile, all in `src/core/screen/`; and search strings to find the family in the
game (`src/ui/searches.ts`); and sharing screenshots from the gallery to the installed app
(`src/share/`, ADR 0010; Android only, iOS has no share target). It needs no new
groundwork beyond G6, so it can run before or alongside Phase A's second half.

## Settled (2026-11-03)

- **Hosting:** a public GitHub repo with GitHub Pages. The code holds no secrets.
- **Formats:** Great, Ultra and Master League only. No rotating cups.
- **Screenshots:** F7 is wanted and worth the extra size. Load the OCR engine only when
  someone uses the screenshot option, so the main app stays small.
- **Priority:** faster input first (see Order).

## Still open

Nothing at the moment.

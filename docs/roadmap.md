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

**G3. Data pipeline v2.** One build script and one versioned, Zod-checked schema that
merges two sources:
- PvPoke `gamemaster.json` (MIT): stats, family, second move cost, plus types and
  moves for F4/F5. Already downloaded; types and moves are present but not kept yet.
- Niantic's game master as published by PokeMiners: evolution Candy (F2) and
  purification cost (F3). PvPoke's file has neither. Licence needs checking before
  we depend on it.

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
2. **Phase D — easier input.** G6 + F6 (done: `src/core/infer.ts`, `src/ui/finder.ts`), then F7.
   F7 part 1 is done: CP, HP and Stardust from a Pokémon screen screenshot
   (`src/core/screenText.ts`, `src/ocr/recognize.ts`, ADR 0008). Part 2, reading the
   appraisal bars, needs pixel analysis calibrated on real screenshots.
3. **Phase A, second half.** G3 + F2. F2 proves the new pipeline end to end with a
   small, visible win.
4. **Phase B — more options.** G4, then F3.
5. **Phase C — battle math.** G5, then F4, then F5. F5 is the largest feature: move
   choice per candidate, opponent list per league and a results view per opponent.

## Decisions to record

| ADR | Decision | When |
|-----|----------|------|
| 0004 | Hosting on GitHub Pages, CI on GitHub Actions | Before G1 |
| 0005 | Data pipeline v2 with two sources (supersedes 0002) | Before G3 |
| 0006 | Options model and per-goal explanations (amends 0003) | Before G4 |
| 0007 | Battle math formulas and meta opponent source | Before G5 |
| 0008 | Screenshot reading runs on the device, nothing uploaded | Before F7 |

## Settled (2026-11-03)

- **Hosting:** a public GitHub repo with GitHub Pages. The code holds no secrets.
- **Formats:** Great, Ultra and Master League only. No rotating cups.
- **Screenshots:** F7 is wanted and worth the extra size. Load the OCR engine only when
  someone uses the screenshot option, so the main app stays small.
- **Priority:** faster input first (see Order).

## Still open

- Licence of the PokeMiners game master, needed for G3. Check before Phase A, second half.

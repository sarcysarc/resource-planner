# 0016 - Stress-test the reading and the grid with real screenshots

**Status:** proposed
**Date:** 2026-11-04
**Deciders:** project owner, Claude

## Context

Unit tests use synthetic scans only, so the site passed every test while players still
saw wrong or missing tiles. The failures come from real screenshots: busy backgrounds,
costumes and hats over the CP, forms, menus mixed in with Pokémon screens. We need to run
many real screenshots through the real code and see where it breaks, without committing a
single real screenshot.

## Decision

- **Answer key, kept private.** `screenshots/stress/truth.json` (gitignored with the rest of
  `screenshots/`) says, for each screenshot, which screen it is and what it shows: name, CP,
  HP, IVs, variant, family. Only the fields set are checked. A screen marked `other` must
  give no CP, HP, IVs or name. The key is checked against `stress/truth.ts` (Zod).
- **OCR once, in a real browser.** `stress/scan.html` runs on the dev server only
  (`stress/plugin.ts`, a Vite plugin with `apply: 'serve'`). It reads every screenshot with
  the site's own `readScreenshot` and saves the scan as JSON, with the time it took.
- **Everything after OCR in vitest.** `stress/*.check.ts` replay the saved scans:
  - `read.check.ts`: `readScan` against the key, one row per miss.
  - `grid.check.ts`: mounts the real page in jsdom, uploads groups of screenshots and
    compares the tiles with the key. Groups: each Pokémon alone; each line, its appraisals
    alone, and with menus and lists mixed in; every line at once.
  - Run with `npx vitest run --config stress/vitest.config.ts`. Not part of `npm test`,
    since the screenshots only exist on the developer's machine.
- **Results stay private.** Outputs go to `screenshots/stress/`. Write-ups name species,
  numbers and counts only.

## Consequences

- A fix to reading can be checked against 229 real screenshots in seconds, without OCR.
- When OCR itself changes, the scans must be taken again in the browser (~15 minutes).
- The key is hand-checked and can be wrong; a failing check is first checked against the
  screenshot.
- Real screenshots never leave `screenshots/`; tests in `tests/` stay synthetic.

# Screenshot-first input

**Status:** proposed
**Date:** 2026-11-03
**Builds on:** ADR 0008 (reading on the device), F6/F7 in `docs/roadmap.md`, and the
screen catalogue in `docs/screens.md`
**Decision record:** ADR 0009 (text-anchored screen parsing)

## Goal

A player should be able to answer "which of these should I spend on?" by sharing
screenshots, with almost no typing. A screenshot is the main way in, not an extra
button next to the form. The app should read everything on the screen that helps
with that question, fill it in, and show where each value came from so the player
can correct it.

Today F7 reads CP, HP, the next power-up's Stardust and appraisal IVs into one
candidate's IV finder. The player still picks the species, the variant, Lucky,
second move, evolve cost and their Stardust/Candy/XL totals by hand. This design
removes most of that.

## Principles

1. **Find values by their labels, never by position.** Players scroll to different
   places and use different phones (720×1604 Android PNG, 942×2048 iPhone JPEG so
   far). A value is "the number just above the word STARDUST", not "the number at
   y = 0.3".
2. **Nothing leaves the device.** Same as ADR 0008. Screenshots and OCR text are
   kept only in memory while reading.
3. **Never keep location.** Screens show where a Pokémon was caught. Lines after an
   origin label ("CAUGHT IN THE WILD", …) and the "around <place>" part of the
   appraisal footer are dropped while parsing. They never reach state, logs or tests.
4. **Every value is editable and shows its source.** For example: "CP 2684 · from
   appraisal". If two screenshots disagree, ask; don't pick one silently.
5. **Check values against game data.** A reading counts only if it fits the game:
   a real power-up cost, a species that exists, a CP/HP that some IVs and level can
   produce. Readings that don't fit are dropped and the player is told.

## What the player does

1. Picks (or shares) **one or more screenshots at once**. Any mix of Pokémon screens,
   appraisal screens, the item bag and the trainer profile.
2. The app sorts them:
   - **Pokémon and appraisal screens** are grouped into candidates. Two screenshots
     are the same Pokémon when species, CP and max HP match.
   - **Account screens** (bag, profile, any Pokémon screen's resource totals) fill
     the shared resources.
3. The first two candidates go into Current and Alternative. If there are more, the
   app lists them all and the player picks two. The target species defaults to the candidates' species
   (or their shared evolution).
4. The player checks the filled values, edits any that are wrong, and sees the
   verdict.

The existing form stays as the fallback and as the place to correct values.

## What each screen gives

| Screen | Values | Found by |
|--------|--------|----------|
| Pokémon | species (or nickname), CP, max HP, types, Stardust total, family Candy total, Candy XL total, power-up cost, evolve cost, second move locked/unlocked, Shadow, Purified, Lucky | labels listed in `docs/screens.md` |
| Appraisal | the above that stays visible, plus exact IVs (pixels) and the real species from the footer | footer "This <Species> was caught", bar pixels |
| Item bag | Rare Candy, Rare Candy XL | item name, then the "xN" count on its icon |
| Profile / map | trainer level | "LEVEL" label; the number by the avatar on the map |
| Buddy | buddy level | filled hearts (later; optional) |

Values a screenshot can't give (target species, goal, league) stay as form fields,
with defaults chosen from what was read.

### Species

The name on screen can be a nickname ("Snorlax100"), and the model often hides CP.
Species is found in this order:

1. **Appraisal footer:** "This <Species> was caught". Always the real species.
2. **Name text** if it matches a species or form name exactly (case-insensitive,
   allowing for common OCR slips like `0`/`O`).
3. **Candy family + numbers:** "<FAMILY> CANDY" narrows it to one evolution family.
   Run IV inference (G6) for each family member and keep the ones whose CP and HP
   fit. Usually one is left.
4. Otherwise ask, with the family members as choices.

Regional forms (Alolan, Galarian, …) usually show the same name. The CP/HP check
in step 3 also separates forms; if it can't, ask.

### Variant, Lucky and second move

| Value | Signal |
|-------|--------|
| Shadow | "PURIFY" button or "SHADOW BONUS" |
| Purified | Return among the moves, "CAUGHT AFTER DEFEATING GRUNT", and no PURIFY |
| Lucky | "LUCKY POKÉMON" text under the name |
| Second move locked | "NEW ATTACK" button, with its cost |
| Second move unlocked | no NEW ATTACK and two charged moves listed |

When a signal isn't on screen (for example, an appraisal screen hides the moves),
the value stays "unknown" and the form keeps the player's choice.

## How it works

```
screenshots
  │ decode (existing image.ts)
  ▼
OCR with word boxes ──► classify screen ──► per-screen reader ──► Reading + source
  │                                            ▲                     │
  └── pixel readers (bars, CP band) ───────────┘                     ▼
                                                    validate against game data
                                                                     │
                                                    merge across screenshots
                                                                     │
                                                    fill form, show sources
```

1. **OCR with word boxes.** Ask tesseract.js for words with bounding boxes as well
   as plain text. `src/ocr/words.ts` turns its output into `Word { text, box }`
   with boxes as fractions of image width, so all later code is
   resolution-independent and has no tesseract types.
2. **Classify the screen** from which anchor words appear: "POWER UP" → Pokémon;
   "was caught on" → appraisal; "ITEMS" + "OTHER ITEMS" → bag; "LEVEL" + "TOTAL
   ACTIVITY" → profile. A screenshot can be Pokémon and appraisal at once. If
   nothing matches, report "not a screen I know".
3. **Anchor helpers** (`src/core/screen/anchors.ts`) answer questions like "the
   number in the nearest word box above this label, overlapping it horizontally"
   or "numbers on the same line, right of this label". Labels may wrap ("GROWLITHE
   / CANDY", "CANDY / XL"), so a label can span two lines.
4. **Per-screen readers** are pure functions from `Word[]` to a partial reading.
   They don't touch the DOM or OCR, so they can be tested on word lists.
5. **Second pass for numbers.** The region next to a found label is cropped,
   reduced to the text colour and re-read as digits only (`src/ocr/crop.ts`); see
   ADR 0009.
6. **Pixel readers** stay as they are (`appraisalBars`, `cpBand`). The bar reader
   read all 21 IVs right on the iPhone JPEGs without changes.
7. **Validation** uses existing code: `powerUpCost` for costs, the species index for
   names, `infer` for CP/HP/IV consistency.
8. **Merging** combines readings for the same Pokémon. Each field keeps its source
   screenshot. Equal values merge; different values become a question.

### Data needed

- **Family name → species.** The "<FAMILY> CANDY" label names the family's first
  member. PvPoke's game master has a family field (G3). Until G3 lands, build the
  map from the bundled evolution data.
- **Evolve Candy cost** is read off the screen when shown, so F2 is less urgent for
  players who use screenshots.

## Code layout

Sizes follow the project quality gates (files ≤ 200 lines, ≤ 10 functions).

| File | Role |
|------|------|
| `src/ocr/words.ts` | tesseract output → `Word[]` with relative boxes |
| `src/ocr/recognize.ts` | changed: returns words as well as text |
| `src/core/screen/types.ts` | `Word`, `Box`, `ScreenKind`, `Region`, `Scan`, `Reading` |
| `src/core/screen/read.ts` | classify, then run the readers for that kind |
| `src/ocr/crop.ts` | crop a region, keep its text colour, for the digits pass |
| `src/core/screen/anchors.ts` | geometry: above, right of, same line, wrapped labels |
| `src/core/screen/classify.ts` | `Word[]` → screen kinds |
| `src/core/screen/pokemon.ts` | Pokémon screen reader |
| `src/core/screen/appraisal.ts` | footer species; uses `pokemon.ts` for the rest |
| `src/core/screen/account.ts` | bag and profile readers |
| `src/core/screen/species.ts` | species resolution (steps above) |
| `src/core/screen/privacy.ts` | drops location lines before any reader sees them |
| `src/core/screen/merge.ts` | group by Pokémon, merge, list conflicts |
| `src/ui/screenshots.ts` | multi-file picker, status, fill and source badges |

`src/core/screenText.ts` is replaced by `src/core/screen/` once its tests pass
against the new readers.

## Testing

- **Unit tests use word lists, not images.** Fixtures are small hand-written
  `Word[]` arrays (JSON) with made-up names and numbers and no location. They cover
  each label, wrapped labels, nicknames, missing CP, popups, and both phone sizes.
- **Pixel tests** keep using synthetic images (ADR 0008).
- **Private regression run.** `npm run check:screenshots` reads every image in the
  git-ignored `screenshots/` folder and compares the result with a git-ignored
  `screenshots/expected.json`. It runs only locally, never in CI, so real
  screenshots never leave the machine.
- TDD as usual: write the reader test from `docs/screens.md`, see it fail, then
  implement.

## Phases

| Phase | Delivers | Main risk |
|-------|----------|-----------|
| S1 | Word boxes, classifier, anchor helpers; port CP/HP/Stardust readers to anchors (done) | Tesseract word boxes on stylised fonts; solved with a digits-only second pass |
| S2 | Species auto-select, Shadow/Purified/Lucky, second move, evolve cost | Nickname + hidden CP cases |
| S3 | Resource totals (Stardust, Candy, XL) fill the shared fields | XL label wrapping; leader covering totals on iPhone |
| S4 | Several screenshots at once, grouping and conflict questions | UI complexity |
| S5 | Bag (Rare Candy) and profile (trainer level) | Rare Candy shown as a separate "could cover" note |
| S6 | Suggested search strings, e.g. `!@3move`, `4*`, `shadow` | None; static help text |
| S7 | Share screenshots straight from the gallery (PWA share target) | Manifest and service worker; iOS support |

Each phase ships on its own and keeps the manual form working.

## Decided (2026-11-03)

1. **Rare Candy is a separate line.** The verdict uses only the family's own Candy
   and XL. When a candidate is short, a note says how much Rare Candy or Rare Candy
   XL would cover the gap, for example "Short 20 Candy; you have 51 Rare Candy".
   Rare Candy is shared across every Pokémon, so it must not quietly decide the
   verdict.
2. **Sharing from the gallery comes after S4.** Until then, use the file picker
   (with several files allowed). A PWA share target is a later phase, S7.
3. **When Candy is hidden**, for example by the team leader on an iPhone appraisal
   screen, the Candy field shows "Candy not visible. Add a screenshot of the
   Pokémon screen, or type it."
4. **With more than two Pokémon, the player picks two.** The app lists every
   Pokémon it read (species, CP, IVs if known), and the player chooses Current
   and Alternative. Comparing more than two waits for G4.

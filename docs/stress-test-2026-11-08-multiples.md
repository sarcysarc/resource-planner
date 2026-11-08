# Stress test, 2026-11-08: multiples

69 appraisal screenshots, one per Pokémon, were pulled from the phone with adb. They cover every species
the player holds 3 or more of (in-game search `count3-`). The set is 14 lines: Pikachu, Meowth,
Graveler, Onix, Electrode, Pinsir, Magikarp, Mewtwo, Ralts, Swablu, Castform, Froakie,
Fletchling, Tandemaus and Flamigo.

The files are in `screenshots/multiples/` (gitignored, ADR 0016). `manifest.csv` names each
shot's species, CP and anything special, and `readings.csv` holds what the app read.
The shots were uploaded in five batches to the dev build (`npm run dev`, master 43a7fa4) in
desktop Chrome, starting from an empty grid.

| Check | Passed | Failed |
|-------|--------|--------|
| Pokémon added, in the right line | 69 | 0 |
| CP read (68 shown in the game) | 65 | 3 |
| IVs read (6 checked against the bars) | 6 | 0 |
| Form right | 63 | 6 |
| Batches kept | 3 of 5 | 2 |

## Failures by cause

### G. A batch is dropped when another is uploaded while a question is open (new)

- **Seen:** batch 1 (Pikachu, Meowth, Graveler, Onix) asked "Which will you battle with from
  Pikachu's line: Raichu or Raichu (Alolan)?". Batch 2 was uploaded before it was
  answered. Batch 1's 13 Pokémon never reached the grid. The same happened to batch 3 (six
  Mewtwo and seven Ralts, asking Gardevoir or Gallade): 26 Pokémon were lost in all. Nothing on the page said
  so. The status line only described the newest batch.
- **Cause (likely, not yet traced in code):** a batch waits in step 1 until its question is answered
  (ADR 0014). A new upload replaces the waiting batch instead of joining it.
- **Fix:** a new upload joins the waiting batch, and its own questions queue behind the
  open one. Failing that, step 1 should at least say that the earlier screenshots were set aside.
- **Workaround seen:** uploading each batch again and answering before the next upload
  added every Pokémon.

### C again. CP left blank (4 shots)

- **Seen:** Graveler 368, Onix 851 (shiny, bright bokeh behind the CP) and Onix 720 had no CP.
  Graveler 368's digits are clear on a pale sky. The fourth is the Mewtwo whose CP is
  covered by an anniversary badge, so its tile is right to show no CP.
- **Not yet known:** whether the OCR read nothing, or the CP check (ADR 0008 amendment)
  rejected a misread. The reading harness (`stress/`) on these three would tell.
- Better than on 2026-11-04: shadow Magikarp 67 and Onix 462 were both read this time.

### B again. Forms whose name is a species come out as the plain species (6 Pokémon)

- **Seen:** Alolan Meowth 437, Hisuian Electrode 706, Armored Mewtwo 1788 and 1774, and
  rainy Castform 685 and 682 were all read as the plain form. Castform's form changes nothing
  in the math. The others have different stats, so their calls are off.
- **Cause:** the game shows the plain name ("Meowth", "Mewtwo") for these forms. The name
  matches a species, so the form match by CP, HP and IVs (fix B) is never tried. The
  2026-11-04 note says "regional ones aside, which show their region in the name". That is
  not so in the game.
- **Fix:** when a family has forms, check the read CP, HP and IVs against every form, not only when
  the name fails. When more than one form fits, ask in step 1 as fix B does.

### Shadows read as normal (by design)

All 15 shadows (2 Magikarp, 4 Mewtwo, 9 Ralts) came out normal. Appraisals don't show the
flames, and each tile says "Taken as not Shadow, Purified or Lucky. Add its Pokémon screen".
Nothing to fix. A set of top screens for these would test shadow detection.

## Checked and right

- Froakie 598 at 9/10/0: the HP bar is empty in the game.
- Fletchling at 156 CP, 15/15/15: a hundo, CP read through a bright sky.
- Electrode 706 at 4/3/13 and Magikarp 67 at 1/14/3: low IVs read right.
- Costumed Froakie 598 joined the Froakie line.

## Ranked fixes

| # | Fix | Why first | Size |
|---|-----|-----------|------|
| 1 | G: a new upload joins the waiting batch | Pokémon are lost silently; anyone uploading in parts hits it | S–M |
| 2 | B: try forms when the name is a species | Regional and Armored forms get the wrong stats | M |
| 3 | C: trace the three blank CPs | Clear digits missed | S |

Each fix gets an ADR amendment and a failing test first, as on 2026-11-04.

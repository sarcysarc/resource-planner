# Stress test, 2026-11-04

229 real screenshots (43 Pokémon, 101 menus and lists) were read by the site's own code
(ADR 0016). Then 65 uploads were replayed through the real page.

| Check | Passed | Failed |
|-------|--------|--------|
| Reading each screenshot | 206 | 23 |
| Tiles after an upload | 50 | 15 |

The live site (current master build) was then run in Chrome on the phone, a moto g 2025.

## On the phone

| Upload | Time | Per screenshot | Result |
|--------|------|----------------|--------|
| 1 appraisal | 17.4 s | 17.4 s (first read, cold start) | read |
| 10 appraisals | 46 s | 4.0–5.2 s, steady | all 10 read, no crash |

- Memory stayed flat: the page's process peaked near 310 MB and Chrome didn't reload the
  tab. The tesseract worker writes diagnostics ("Total count=0") to the console as
  errors. They are harmless.
- **The phone already had a saved Bulbasaur grid. All 10 Pokémon were added to it as
  "Bulbasaur"**: Litten, Sandygast, Celebi, Gengar, Giratina, Gyarados, Rattata, Magikarp
  and Mewtwo, each with its own CP and IVs, plus a blank tile. Nothing on the page said so.
  This is cause D, hit through the saved grid (ADR 0014) with no mixing needed. It is the
  most likely reason the site seems not to work: after the first use, every later
  upload of another line is renamed to the old one.
- In Chrome the files were built in the page and given to the picker's change event,
  because Chrome on Android won't let a debugger hand it a file path. The installed app
  was then tested with the real Share sheet and the real photo picker.

### In the installed app, starting from an empty grid

| Upload | Time | Per screenshot | Result |
|--------|------|----------------|--------|
| Share 1 appraisal from Files | about 7 s | — | "Sandygast, CP 772, IVs 6/15/8", right |
| Share 10 appraisals from Files | 49 s | 4–5 s | all 10 read, no crash |
| Pick 10 appraisals with the photo picker | about 55 s | 4–5 s | all 10 read, no crash |

- Share (ADR 0010) and the picker both work. The service worker stashes the files and the
  page reads them. Memory peaked near 280 MB for the page.
- **Both times, all 10 tiles were named "Sandygast"**, the first screenshot's line, with
  each Pokémon's own CP and IVs right, e.g. "Sandygast, CP 2802, IVs 12/3/14" for the
  Gyarados. The grid was empty, so cause D needs no saved grid: the first screenshot sets
  the line and every other line is renamed to it, without a word.

## Failures by cause

### A. Menus and lists give fake "IVs 0/0/0" Pokémon (6 of 15 grid failures)

- **Seen:** every upload that mixed menus in got two extra tiles, "X, IVs 0/0/0".
- **Cause:** two non-Pokémon screens (a list and a terms page) have three
  long horizontal bars low on the screen. `appraisalBars` measures them as three empty IV
  bars. Since the bars alone mark an appraisal (ADR 0015 amendment), the screen becomes a
  Pokémon with IVs 0/0/0 and joins the grid's line.
- **Fix:** accept bars only when the screen also looks like a Pokémon screen (CP, HP or
  a family label read), or when the bars have the track's shape: the same length, evenly
  spaced, with the rounded empty track behind them. A real 0/0/0 still has the track.
- **Done** (ADR 0015 amendment): both screens read nothing but the bars, so bars now
  count only when something else of a Pokémon is read. Afterwards: reading 21 misses (was 23),
  grid 9 failures (was 15), none new.

### B. Forms come out as "New Pokémon" (2 grid failures)

- **Seen:** Giratina and Indeedee were read correctly by name, yet the tile says "New Pokémon".
- **Cause:** the game screen shows "Giratina". The data only has "Giratina (Altered)" and
  "Giratina (Origin)", and Indeedee only has Male and Female. `findSpecies` matches whole
  names, so it finds nothing. The family fallback then finds two forms and asks "which is
  it?" in a status line that the grid doesn't show.
- **Affects:** every Pokémon whose base name is not a species in the data. That includes
  many forms, regional ones aside, which show their region in the name.
- **Fix:** match a read name to the forms that start with it. When only one form fits the
  CP, HP and IVs, take it. Otherwise take the default form (the first listed) and
  say on the tile that the form was guessed, so the player can change it.
- **Done** (ADR 0015 amendment): a name or Candy label that matches no species is matched
  to the forms whose name, without the bracket, is near it, then narrowed by the CP, HP and
  IVs. When more than one form still fits, step 1 asks which, instead of guessing, so every
  question comes before the grid. Both tiles are now named by their form: "Giratina
  (Altered)" and "Indeedee (Female)". The answer key now expects those names.

### C. A CP is missed or loses a digit (5 shots, 2 grid failures)

- **Seen:** Skarmory 1161 read as 161 on three shots with a dark background. CP not read
  at all on Onix's appraisal, a shadow Magikarp (CP 67, two screens), the shadow
  Snorlax's appraisal, and a lucky Drifblim whose hat covers the "CP".
- **Cause:** the CP band OCR gets "crl161", "crb7/", or nothing. On busy backgrounds the
  white digits merge with the background. Also, nothing checks whether the CP fits the
  rest: CP 161 with HP 103 fits no Skarmory, yet it is taken.
- **Fix, in order:**
  1. Plausibility: when the CP fits no level and IVs for the species with the HP read, try
     the readings with a digit added or changed and keep the only one that fits. Otherwise
     leave the CP blank and say so on the tile.
  2. Read the CP band again after keeping only near-white pixels and scaling it up.

### D. Other lines are silently renamed (the "every line at once" upload, and on the phone)

- **Seen:** with every Pokémon uploaded at once, all 43 tiles took the first line's name,
  e.g. "Aggron, CP 1177" for the Snorlax.
- **Cause:** a grid holds one line (ADR 0015). The line is set by the first screenshot
  read, or kept with the saved grid. Readings from another family are put on the grid's
  form instead of being turned away. So any upload of more than one line, and every later
  upload once one line is saved, is renamed.
- **Fix:** the line comes from the screenshots, not from the first one or the saved grid.
  When an upload holds more than one line, or another line than the saved grid, offer a
  grid per line (or a new grid), and say on step 1 which screenshots were left out and why.
- **Done, first slices** (ADR 0017): each Candy family read opens its own line, with its
  own grid, target and Candy; step 2 lists the lines by Pokédex number when there are two
  or more, and tapping one opens it. The book of lines is saved; a saved one-line grid is
  read as one line. Rows without a call yet, duplicates and per-line Clear are later slices.
- **Done, duplicates** (ADR 0017): screenshots already read are skipped by fingerprint;
  one read again at another CP with the same IVs is asked about in step 1; a look-alike
  read without IVs is noted on the tile it joined.
- **Done, row calls** (ADR 0017): each row shows its line's biggest gain, or why it can't
  be compared, and rows are ordered by gain, then Pokédex number.
- **Done, the target** (ADR 0017): each line's target is its final evolution; a branching
  line asks for it in step 1.
- **Done, per-line Clear** (ADR 0017): the open line can be cleared on its own.

### E. Reading takes about 4–5 s per screenshot

- **Seen on the desktop:** a median of 3.0 s per screenshot, 7.3 s at the 90th percentile and 11.1 s at most.
  57 of 229 took over 5 s. On the phone it's about the same: 4–5 s each, 17 s for the
  first. Slow, but it works.
- **Cause:** each screenshot starts a new tesseract worker, which loads the language data.
  Then it runs two full-page passes (plain and dark ink), the CP band, and the digit
  regions.
- **Fix:** start one worker per upload and reuse it. Run the dark-ink full pass only when
  the plain pass misses the CP, the HP or the name. Measure on the phone before and after.

### F. Smaller misreads (no grid failure today)

- Family label: "GROWLITHE" not read once, "NUMLL" for NUMEL, "ARDUST" from the Stardust
  label taken as a family. The near-match already rescues most of these.
- Names missed on the Exeggcute, Rattata and Onix top screens. The family fills the gap.
- HP 79 read as 72 on one Riolu appraisal.
- Purified isn't recognised on top screens. The badge may not show there, so this needs
  checking before any fix.
- The item bag is classified as a Pokémon screen. It gives no tile, so this is harmless.

### Fixes to the answer key

- The 3582-CP Mewtwo's CP is covered on both its screenshots. The tile is right to
  show no CP. The key should expect "Mewtwo, IVs 15/15/15" (3 of the 15 grid failures).
  **Done:** the key leaves the CP out of the title when no screenshot of the Pokémon shows it.

After A, B and the answer-key fix: reading 21 misses, grid 3 failures (was 15): Drifblim
and Skarmory (cause C) and every line at once (cause D).

After the first slices of D: reading 19 misses, grid 3 failures, all cause C. Every line at
once now gives 43 tiles in their own lines; only Drifblim and Skarmory differ, by their CP
as when uploaded alone. The grid check opens each line in step 2's list to see its tiles.

## Ranked fixes

| # | Fix | Why first | Size |
|---|-----|-----------|------|
| 1 | D: the line comes from the screenshots; another line is turned away and named | Any mixed upload, and every upload after the first, is renamed; seen on the phone via Share, the picker and the saved grid | S–M |
| 2 | A: bars need a Pokémon screen or the track | Fake tiles on any mixed upload | S |
| 3 | B: match forms by base name | Every form Pokémon is unnamed | S–M |
| 4 | E: one worker, dark pass only when needed | 45 s for 10 screenshots, works but slow | S |
| 5 | C1: check the CP against HP and species | Wrong CP is taken as true | M |
| 6 | C2: clean the CP band before OCR | Fewer missed CPs | M |
| 7 | F: smaller misreads | Rarely changes a tile | — |

Each fix chosen gets an ADR amendment and a failing test first. The stress checks are run
again after each fix.

After duplicates: unchanged, reading 19 misses and grid 3 failures, all cause C; no
question is asked on the stress set.

After row calls: unchanged, reading 19 misses and grid 3 failures, all cause C. Every line at
once gives 33 lines; working out their calls took about 0.5 s in jsdom. The two lines that
couldn't be compared with every IV known lacked the Candy to evolve, so they say so.

After the target: unchanged, grid 3 failures, all cause C. Exeggcute and Rowlet now ask for
their final in step 1; the grid check answers with the first. Every line at once: 4 lines
with a gain, 26 needing another to compare, 2 needing the Candy to evolve and 1 IVs, as before.

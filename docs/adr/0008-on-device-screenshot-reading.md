# 0008 - Screenshot reading runs on the device

**Status:** accepted
**Date:** 2026-11-03
**Spec:** docs/roadmap.md (F7)
**Deciders:** project owner

## Context

Typing CP, HP and Stardust is the slowest part of using the IV finder (F6). F7 reads
them from a screenshot of the Pokémon screen instead. Screenshots can show a trainer's
name, friends and location, so they should not leave the phone. The settled roadmap
also says the OCR engine must only load when someone uses it, so the main app stays
small.

## Decision

- Use **tesseract.js 7** (Apache-2.0) with the English LSTM model from
  `@tesseract.js-data/eng` (`4.0.0_best_int`, MIT). It runs in a Web Worker; the image
  never leaves the browser.
- **Self-host every OCR file.** `scripts/copy-ocr-assets.mjs` copies the worker, the
  three LSTM-only WebAssembly cores and the language file into `public/ocr/` (ignored by
  git) before `dev` and `build`. tesseract.js points at those paths, so no request goes
  to a CDN or any other host.
- **Load on demand.** The UI imports `src/ocr/recognize.ts` with a dynamic `import()`
  when a screenshot is chosen. Vite puts tesseract.js in its own chunk; the core and
  language files (about 7 MB) download only then, and the browser caches them.
- **Read text, then parse in plain code.** `src/core/screenText.ts` turns OCR text into
  CP, HP and the next power-up's Stardust. A Stardust value counts only if it is a real
  power-up cost for the chosen Shadow, Purified and Lucky options. Results fill the
  finder fields; the player checks them and taps Find IVs as before.

### Amendment (2026-11-03): appraisal screenshots

Seven real appraisal screenshots showed the appraisal screen also displays CP and HP,
and each bar is a flat colour (orange `242,166,74`; pink-red `222,125,128` when 15) on a
grey track (`226,226,224`) with white gaps between its three segments. So:

- **Bars are read from pixels, not OCR.** `src/ocr/pixels.ts` finds the three bars
  (the lowest three runs of bar-coloured rows, 1–4% of the image width tall) and reads
  each IV as `round(15 × filled / (filled + track))`. On all seven screenshots the IVs
  read this way match exactly one level for the CP and HP shown.
- **CP is read from a crop.** The small stylised "CP" and white digits on busy
  backgrounds defeated full-screen OCR (1 of 7 right). Cropping to the top band and
  keeping only near-white pixels read CP right on all seven. HP comes from full-screen
  OCR (7 of 7).
- The screenshots stay in `screenshots/`, ignored by git, because they show where each
  Pokémon was caught. Tests use synthetic images with the measured colours and layout.

### Amendment (2026-11-04): one worker per upload, dark pass only where needed

The stress test (docs/stress-test-2026-11-04.md, cause E) took a median of 3.0 s per
screenshot. Timing each stage on all 229 screenshots showed that starting a worker for each one
cost most of that. Of what was left, the dark-ink page pass took about half (median 0.43 s,
against 0.29 s for the plain pass). So:

- **One worker reads a whole upload.** `openReader()` starts it, `read()` reads each
  screenshot, `close()` shuts it down; `readImages` closes it even when one fails. The
  digits-only parameters are given to each `recognize()` call, which restores them, so
  the next page pass reads text. Reusing the worker read every screenshot exactly as before.
- **The dark-ink pass runs only where it can matter** (`core/screen/darkPass.ts`). Skipping
  it lost the family, totals or costs on 34 of 44 top screens and 16 of 37 bottom screens.
  So it still runs on every Pokémon, bag and profile screen. It is skipped on an appraisal
  whose name and HP the plain pass read (it lost nothing there but a junk family on one, and
  fixed one HP). It is also skipped on a screen the plain pass shows is none of those, which
  lost nothing on 94 menus.

Afterwards, on the same desktop: median 0.44 s (was 3.0 s), 90th percentile 1.0 s (was 7.3 s),
appraisals 0.36 s, none over 5 s (was 57 of 229). Reading misses went from 21 fields to 20,
and the grid failures stayed at the same three. On the phone, in the installed app, 10
appraisals took 19.4 s (was 46–55 s), about 1–2 s each.

### Amendment (2026-11-04): a CP must fit the species and HP

The stress test (cause C) found the CP missed on 5 screenshots and read a digit short
("crl161" for 1161) on 3. Nothing checked a CP against the rest, so CP 161 with HP 103 was
taken for a Skarmory that can't have it, and made a Pokémon of its own. So:

- **The CP is checked against the species and HP** (`ui/cpCheck.ts`, before screenshots
  are sorted into Pokémon). `core/reachableCp.ts` lists every CP the species can show at a
  level and IVs that give the HP read, keeping to IVs the appraisal read. Every form the
  game shows by the same name counts (Armored Mewtwo is shown as "Mewtwo"). The Stardust
  cost is left out: a Lucky the screen didn't show as one costs half, which would rule out
  its real CP.
- **A CP that doesn't fit is repaired only when one answer fits.** First the band's other
  readings (`cpOptions`: letters OCR gives for digits, "l" for 1 and "b" for 6, read as those
  digits; digits a space split joined up). Else the one CP a digit off, added or changed,
  that fits. Otherwise the CP is left blank and the screenshot's form says the CP read can't
  be right with this HP. With no HP or no species read, the CP is kept as read.
- **White patches too big or solid to be digits are dropped from the CP band**
  (`ocr/blobs.ts`). On bright backgrounds keeping near-white pixels also kept background,
  and OCR read nothing. Reading the band again scaled up 2× or 3×, or at other thresholds,
  was tried on the 83 screenshots with a CP: none read the missed CPs, and each read fewer
  right (64–71 against 73). Dropping patches read 74, losing none, at no extra OCR call.

Afterwards, on the stress set: CPs missed or wrong went from 8 screenshots to 1 (the shadow
Snorlax, whose 7s are tinted purple), and grid failures from 3 to none. Skarmory's "161" is
repaired to 1161 by the added digit, and the Drifblim tile now matches the key. The 3582 Mewtwo
covers all of its CP but "582" on its appraisal; the check repairs that to 3582, its real CP.
No other field read worse.

### Amendment (2026-11-08): a second, brighter CP band (issue #5)

On a pale sky the CP band read nothing on three screenshots (Graveler 368, Onix 851 and
720), so the CP check had no CP to check. Sky as pale as 220–245 in every channel passed the
215 threshold and joined the digits into patches too big to keep, and on the 851 a sparkle as
white as the digits touched the 8.

- **The band is read a second time, keeping only the purest white** (`brightCpBand`:
  above 245 in every channel). Solid ink squares 1.7% of the screen wide, which no digit
  stroke holds, are erased first (`ocr/solid.ts`), so a sparkle no longer takes the digits
  beside it with it. Then patches are dropped as before. This costs one more OCR call per
  screenshot.
- **The first band still leads.** Alone, the bright band read one CP fewer than the first
  (130 against 131 of 153) and lost different ones, so neither replaces the other. Its CP is
  taken only when the first band has none and the number sits by the CP label. Every other
  reading it gives, a bare number included, is only an option for the CP check. A bare
  number may have lost digits erased with a sparkle.

Afterwards, on the stress and multiples sets: CPs neither read nor among the options went
from 9 screenshots to 3, losing none. Graveler 368 and Onix 720 are read, as are four CPs
whose first digit was lost before (Meowth 437, Onix 462, Froakie 414, the 3582 Mewtwo). Onix
851's bright band reads "51", only an option; the CP check repairs it to 851, the one CP a
digit off that fits its HP and IVs.

### Amendment (2026-11-04): name and family past the screen's quirks

The stress test (cause F) found a name missed on three top screens and a family on two. In
each case the text was read, but not where it was looked for. So:

- **The name may be two lines over HP.** The rename pencil beside the name is often read as
  a line of its own ("J]"), so when the line over HP holds no name, the one above it is tried.
- **A family label may wrap,** the family on the line above "CANDY" on the bottom screen.
- **The end of "STARDUST" is not a family.** When its start is cut off ("ARDUST"), it was
  taken for one.

Two causes were looked at and left: a one-letter misread ("NUMLL") that the near-match
already turns into the right family, and the shadow flames on a top screen. Counting purple
pixels scored the purple backgrounds of Celebi and Mewtwo above every shadow Pokémon, so it
would mark normal Pokémon as shadow. A purified Pokémon's top screen shows nothing of it at
all, so the answer key no longer expects it there.

Afterwards, on the stress set: 4 screenshots with a misread (was 11), and every grid right.

### Amendment (2026-11-09): Shadow from the sky (issue #13)

An appraisal and a top screen carry no Shadow label, so a Shadow Pokémon seen only there was
taken as not Shadow. Its sky is the sign: dark indigo behind the Pokémon, where other types
show their own colours. `shadowBackground` (src/ocr/shadow.ts) averages a strip at the left
edge, from 12% to 30% down, above the card and clear of the Pokémon, and calls it Shadow when
red is under 36, green under 28 and not above red, and blue between 65 and 100. On every local
screenshot, Shadow skies averaged about (12–30, 10–22, 72–84); the nearest others were
Ghost-type nights (green above red), Psychic purples (red near 50 or more) and Electric navies
(blue near 60). Counting purple flame pixels was rejected again, as Psychic skies are purple.

The scan carries `shadow: true`, read as the variant when no label names one. A top screen
counts as knowing whether the Pokémon is Shadow, so its tile's note no longer asks for the
Pokémon screen; with only the variant left unseen (Purified) it asks for the screen scrolled
down.

## Consequences

- No network request carries the screenshot or its text; it works offline once cached.
- First use on a phone downloads about 7 MB. The button says it is reading while it
  works.
- Bar colours and layout were measured on one phone (720 px wide). Other screens should
  scale, but a theme or UI change in the game would need new measurements.
- OCR can misread stylised digits. Values are put in editable fields, not used
  silently, and the IV finder rejects combinations that cannot exist.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Cloud OCR (e.g. a vision API) | Better accuracy | Uploads screenshots; needs a key and a server | Breaks "nothing uploaded"; site has no backend |
| tesseract.js from the jsDelivr CDN (its default) | No copy step | Third-party request on every first use; CDN outage breaks the feature | Self-hosting costs one small script |
| Browser `TextDetector` API | Built in, no download | Not available in Safari or most Chrome builds | Not portable |

## Links

- Supersedes: N/A
- Related: 0001, 0004, docs/roadmap.md

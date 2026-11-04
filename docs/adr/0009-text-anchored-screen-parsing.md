# 0009 - Read screens by their labels, not by position

**Status:** accepted (S1 built 2026-11-03)
**Date:** 2026-11-03
**Spec:** docs/design/screenshot-first.md, docs/screens.md
**Deciders:** project owner

## Context

Screenshots are becoming the main way to enter data. The current reader
(`src/core/screenText.ts`) runs regular expressions over the whole OCR text, plus
one fixed crop for CP. That works for CP, HP and the power-up cost, but not for the
values we now want: Stardust, Candy and XL totals, evolve cost, the second move
cost, species and variant. Several of these are just a number with a label under
it, and the same number can appear elsewhere on the screen.

Fixed coordinates won't work either. Players scroll the Pokémon screen to
different positions, and screenshots seen so far come from two phones with
different sizes and formats (720×1604 PNG, 942×2048 JPEG).

## Decision

- **Ask tesseract.js for word boxes** (`blocks: true`) and convert them in
  `src/ocr/words.ts` to `Word { text, box }`, with boxes as fractions of the image
  width. Nothing after that step depends on tesseract types or pixel sizes.
- **Find each value relative to its label**: for example, the number whose box is
  nearest above "STARDUST" and overlaps it horizontally. Labels may wrap onto two
  lines. Geometry helpers live in `src/core/screen/anchors.ts`.
- **Classify the screen first** from anchor words (Pokémon, appraisal, item bag,
  profile), then run only the readers for that kind.
- **Readers are pure functions** from `Word[]` to a partial reading, tested with
  hand-written word lists. No images are needed in unit tests and no real
  screenshot enters the repo.
- **Drop location text before reading.** `src/core/screen/privacy.ts` removes the
  lines after origin labels and the "around <place>" part of the appraisal footer.
  Readers never see them.
- **Re-read numbers in a second pass.** Labels read well (about 95% confidence), but
  numbers next to icons don't ("§135,770", "£3" for 8). So once a label is found, its
  value's region (above the label for totals, right of it for button costs) is cropped,
  reduced to the text colour (white on buttons, dark teal for labels) as black on
  white, doubled, padded, and read again with a digits-only whitelist, one line at a
  time. On the local screenshots this read every total and cost tried correctly.
  Tesseract's confidence is near 0 on these reads even when right, so values are
  checked against game data (real power-up costs) instead.
- Pixel readers from ADR 0008 (appraisal bars, CP band) stay as they are.

### Amendment (2026-11-04): a second whole-page pass in text ink

A test on a real phone found that, on some screens, the plain page pass never saw the
small grey labels (STARDUST, CANDY), the white text on buttons (POWER UP, EVOLVE) or a
red "not enough Candy" cost. The colourful top of the screen threw tesseract off, so no
label was found and nothing was re-read.

- **Read the whole page twice.** The second read is of `textInk` (`src/ocr/ink.ts`), a
  black-on-white copy of the screen. Dark and red pixels become black. So do narrow
  white strokes with button colour on both sides, which are letters on a button rather
  than the white card.
- **Merge the two word lists** (`src/core/screen/passes.ts`). Where both passes read
  the same spot, the ink word wins. Lines are renumbered top to bottom so readers see
  one page. The location filter runs after the merge.
- The cost crops accept red as well as teal (`cost` ink).
- Totals labels match loosely (`src/core/screen/fuzzy.ts`): one wrong letter in four,
  and STARDUST may be split into two words ("SEAR LUST", "CANLY"). The numbers read
  above them must still be well formed.
- A CP band whose label came out as another word ("Chk. 24") is not trusted: the
  first digits went with it.

Cost: one more full OCR pass per screenshot. On a laptop, 8 real screenshots took
about 10–12 s in the app instead of about 6 s.

## Consequences

- Works at any scroll position, on any phone, as long as the label is on screen.
- Values without a printed label (moves, the name) need their own rules, such as
  "the lines after GYMS & RAIDS". These are in `docs/screens.md`.
- Every screenshot costs two or more OCR passes. The second pass reads small crops,
  so it adds little time.
- Labels on the dimmed appraisal background can come out partial ("SNORLA"); those
  readers will need fuzzy matching (S2/S3).
- OCR puts icon junk before origin labels or misses them, so the location filter
  finds the label anywhere in a line and also drops "Town, Region" lines on their own.
- `readScreenshot` no longer returns the full OCR text, only words after the location
  filter, so location text can't leak into the UI.
- `screenText.ts` is gone; its tests now run against `src/core/screen/pokemon.ts`.
- Ink colour alone is not enough near icons: the teal test also checks the
  blue-green tint so Candy XL icon stripes don't merge into the digits (S3).
- A game UI change that renames a label breaks only that label's reader, and the
  local regression run shows which one.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Fixed crops per value | Simple; fast | Breaks when scrolled or on another phone | The user confirmed players scroll to different positions |
| Regex over plain OCR text (today) | Already built | Can't tell which number belongs to which label | Not enough for totals and costs |
| Template matching on images | No OCR for icons | Needs reference images of game art in the repo; fragile across themes | Copyright and upkeep |
| Cloud vision model | Most robust | Uploads screenshots | Breaks ADR 0008 |

## Links

- Supersedes: N/A
- Related: 0008, docs/design/screenshot-first.md, docs/screens.md

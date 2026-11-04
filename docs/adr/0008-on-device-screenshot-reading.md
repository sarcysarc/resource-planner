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

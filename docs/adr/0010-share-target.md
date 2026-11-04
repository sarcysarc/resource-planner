# 0010 - Receive shared screenshots through an installed web app

**Status:** accepted
**Date:** 2026-11-03
**Spec:** [screenshot-first design](../design/screenshot-first.md) S7
**Deciders:** project owner, Claude

## Context

Players take screenshots in the game, then switch to the planner and pick them from a
file chooser. Sharing them straight from the gallery or the screenshot preview saves
those steps. The site is static on GitHub Pages (0004), so nothing on a server can
receive an upload, and screenshots must not leave the phone (0008).

## Decision

- Make the planner an **installable web app**: `public/manifest.webmanifest` with
  icons, `display: standalone`, and a `share_target` that accepts images by
  `POST multipart/form-data` to `./share`.
- A **service worker** (`src/sw.ts`, built as its own entry to `sw.js` at the site
  root, so its scope covers the app) answers that POST itself. It puts the files in a
  Cache Storage cache on the phone and redirects to `./?shared`. No request reaches
  GitHub Pages.
- On load with `?shared`, the page takes the files out of the cache, **deletes them**,
  and reads them as if they were picked in the shared picker. The query is then
  removed so a reload does not repeat it.
- The stash and take steps live in `src/share/stash.ts` against a small cache
  interface, so they are tested without a browser. `src/sw.ts` only wires events and,
  like `src/main.ts`, is left out of coverage.
- The worker is registered only in production builds. The dev server is checked with
  `vite build` and `vite preview`.
- The worker does no offline caching. That is a separate decision if it is wanted.

## Consequences

- Android Chrome and other Chromium browsers show the planner in the share sheet once
  it is installed ("Add to Home screen").
- **iOS Safari does not support share targets.** iPhone players keep using the
  picker; installing still gives a home-screen icon.
- Screenshots sit in the browser's cache only between the share and the page load.
- The build gains a second entry and a fixed `sw.js` name. Changing the worker's
  URL would leave old installs with a stale worker until they reload.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Share target with `GET` | No service worker | Carries only text and URLs, not files | Screenshots are files |
| A server that receives the upload | Works without a service worker | Images leave the phone; needs hosting | Breaks 0004 and 0008 |
| IndexedDB instead of Cache Storage | Stores Blobs directly | More code for the same job | Cache Storage keeps files with their type in a few lines |
| A PWA plugin (e.g. vite-plugin-pwa) | Generates the worker and manifest | A dependency and offline caching we do not need yet | Two small files are enough |

## Links

- Supersedes: N/A
- Related: 0004, 0008

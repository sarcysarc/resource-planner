# 0001 - Static TypeScript web app with a pure calculation core

**Status:** accepted
**Date:** 2026-11-03
**Spec:** N/A (initial design discussion)
**Deciders:** project owner, Claude

## Context

Players compare two Pokémon from the same evolutionary line while holding the game on
their phone. The tool must run on a phone browser, needs no server-side state, and its
math must be trustworthy, so it has to be easy to test in isolation.

## Decision

- Vite + TypeScript (strict), no UI framework; plain DOM rendering.
- All game math lives in `src/core/` and `src/data/` as pure functions with no DOM access.
  UI code in `src/ui/` only reads inputs and renders results.
- Vitest (+ jsdom for UI tests) with an 80% coverage threshold.
- ESLint enforces the quality gates: 200 lines/file, 20 lines/function, 3 params, depth 2.
  Functions needing more inputs take a single options object.

## Consequences

- Deploys as static files anywhere (`npm run build` → `dist/`).
- The core can later back other front ends (spreadsheet export, screenshot input).
- No framework means hand-written DOM code; acceptable at this size.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| React/Vue SPA | Componentized UI | Extra dependency weight | UI is one form and one table |
| Spreadsheet | No code | Hard to test, 4096-spread ranking is awkward | Correctness matters most |
| Native app | Could read screen | Store distribution, far more work | Out of scope for v1 |

## Links

- Supersedes: N/A
- Related: 0002, 0003

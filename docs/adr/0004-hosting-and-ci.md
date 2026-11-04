# 0004 - Public GitHub repo, GitHub Actions CI, GitHub Pages hosting

**Status:** accepted
**Date:** 2026-11-03
**Spec:** [roadmap](../roadmap.md) G1 / F1
**Deciders:** project owner, Claude

## Context

The planner is used on a phone, next to the game, so it needs a public link. It is a
static build with no secrets and no server state (0001). Quality gates are checked
locally today, and nothing stops a push that breaks them.

## Decision

- Public GitHub repository named `resource-planner`. The code holds no secrets, and
  free Pages needs public.
- Low profile until the app is more complete: a neutral repo name, no repo
  description or topics, and `<meta name="robots" content="noindex, nofollow">` on the
  page. (A robots.txt would not help: crawlers only read it at the domain root.)
- One GitHub Actions workflow on every push and pull request: lint, typecheck,
  tests with coverage (80% threshold), build.
- On pushes to `master`, the same workflow uploads `dist/` and deploys it to GitHub
  Pages. Deploy runs only after the checks pass.
- Vite `base: './'` keeps asset paths relative, so the site works under the
  `/<repo>/` path Pages serves it from.

## Consequences

- A red check blocks the deploy, so the live site always passed the gates.
- Anyone can read the code and the bundled game data (PvPoke data is MIT).
- A scheduled data refresh (roadmap G3) can later run in the same workflow setup.
  Done in ADR 0013.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Private repo + Vercel/Netlify | Code stays private | Second service and account to manage | Nothing to hide; owner chose public |
| Local only | No setup | Not usable on the phone | Phone use is the point |

## Links

- Supersedes: N/A
- Related: 0001

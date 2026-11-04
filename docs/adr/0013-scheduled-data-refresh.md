# 0013 - Scheduled data refresh

**Status:** accepted
**Date:** 2026-11-04
**Spec:** [roadmap](../roadmap.md) G1
**Deciders:** project owner, Claude

## Context

The bundled data (`species.json`, `moves.json`, `pvp.json`) is built by
`npm run update-data` from PvPoke and PokeMiners (ADR 0005, 0007, 0012). It is only
as fresh as the last time someone ran it by hand. New species and moves arrive with
game updates. PvPoke's rankings shift with the meta, and F5 lists the top 30 opponents
from them. ADR 0004 left room for a scheduled refresh in the same Actions setup.

## Decision

- A second workflow, `.github/workflows/refresh-data.yml`, runs weekly (Monday
  05:17 UTC) and on demand.
- It runs `npm run update-data` on `master`. The build is deterministic, so if the
  sources have not changed, `src/data/` is unchanged and the job stops there.
- If the data changed, it runs the same gates as CI (lint, typecheck, tests with
  coverage, build). Only if they pass does it commit `src/data/` to `master` as
  `github-actions[bot]` and push.
- A push made with the workflow's own token does not trigger other workflows. So the
  job then dispatches `ci.yml` on `master`, which checks again and deploys to Pages.
- No pull request: the data is generated, the gates already ran, and the point is
  that it stays current without manual work.

## Consequences

- The live site picks up new species, moves and rankings within a week, with no manual
  step.
- If upstream data breaks a schema or a test, the job fails and nothing is committed.
  GitHub emails the owner about the failed run, and the site keeps the last good data.
- Bot commits land on `master`, so pull before pushing local work.
- If the job's push races a local push, it fails and next week's run retries.
- GitHub disables scheduled workflows after 60 days with no repository activity.
  Re-enable it from the Actions tab if that happens.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Open a pull request each week | Owner reviews the data diff | A manual merge every week; PRs opened by the workflow token do not trigger CI | Defeats "no manual work"; gates already run |
| Fetch data at runtime in the browser | Always current | Depends on third-party hosts at page load; no schema check before users see it | Bundled, checked data is more reliable |
| Keep refreshing by hand | No bot commits | Goes stale | The roadmap asked for it to be automatic |

## Links

- Supersedes: N/A
- Related: 0004, 0005, 0007, 0012

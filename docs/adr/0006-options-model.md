# 0006 - Options model: compare N options, each with an explanation

**Status:** accepted
**Date:** 2026-11-04
**Spec:** [roadmap](../roadmap.md) G4, F3
**Deciders:** project owner, Claude

## Context

`compare` takes exactly two candidates, current and alternative, and the verdict is
one of keep, switch, save or neither (ADR 0003). F3 needs a third option that nobody
typed: a Shadow candidate's purified self (IVs +2 each, level at least 25, purify
cost). F4 and F5 will add measures of value beyond stat product, and players will
need to see why one option wins. Generalising once avoids reworking `compare`,
`decide` and the results table for each of those features.

## Decision

- **An option** is a candidate with a label and where it came from: typed (current,
  alternative) or derived from another option (purified). `compare` takes a list of
  options, current first, and the shared resources. They all share one Candy family,
  so they draw on one pool, as before.
- **Derived options.** Each Shadow option whose purify cost is known (ADR 0005 tier
  table) adds a purified option: variant Purified, each IV +2 up to 15, level raised
  to 25 if lower, and the purify Stardust and Candy added to its cost. When the tier
  is unknown, F3 asks for the cost (or a purify screenshot) instead of guessing.
- **Each goal result carries an explanation** as data, not text: what the value is
  (stat product at level L and CP, or Attack with the Shadow bonus) and the cost split
  into parts (power-ups, second move, evolve, purify). The UI turns it into words, so
  F4 and F5 add new value kinds without touching the verdict.
- **Verdict across N options**, the same rules as ADR 0003 written for a list:
  1. Only eligible options count. None eligible → `neither`.
  2. The contenders are the eligible options within 1% of the best value (value ≥
     best ÷ 1.01).
  3. Of the contenders, the cheapest wins: fewer XL Candy, then less Stardust. A tie
     goes to the earlier option, so the current one wins ties.
  4. The winner is the current one → `keep`. Otherwise `switch` to it when affordable,
     else `save` for it. The verdict names the winning option.

  With two options this gives the ADR 0003 result, and today's tests still hold. The 1%
  line is now measured against the best value instead of the current one, which moves
  it by under 0.01% of value.
- **Results view.** One column per option. The verdict names the option ("Purify
  current", "Switch to alternative", "Save for purified alternative"). On a phone each
  option stacks as a card, as the table already does.
- Each option's column shows its value change against the current option.

## Consequences

- F3 is mostly the purify transform plus labels; the verdict needs no change for it.
- A third typed candidate becomes a UI choice only; the core already handles it.
- The `Verdict` type changes from a string to `{ kind, option }`, so `render.ts`,
  `format.ts` and their tests change once, here.
- Stat product still ignores the Shadow battle multipliers (Attack ×1.2, Defence
  ×0.83), which nearly cancel in a product. Raids already apply the Attack bonus. G5
  brings the full battle formula.
- Purifying also swaps a Shadow's Frustration for Return; moves wait for G5.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Keep two candidates; show purify as a note under the Shadow one | Smallest change | No verdict for purifying; F4/F5 face the same limit | F3's question is "purify or keep", which needs a verdict |
| Pairwise verdicts (current vs each other option) | Reuses `decide` as is | Several verdicts can disagree; no single answer | Players want one recommendation per goal |
| Explanations as ready-made text in core | Simple to render | Wording lives in core; harder to test and to change | Data keeps core free of UI copy |

## Links

- Amends: 0003
- Related: 0005 (purify cost table)

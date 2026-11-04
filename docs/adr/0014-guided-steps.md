# 0014 - Guide the player through three steps, screenshots first

**Status:** accepted; partly superseded by 0015 (one picker, step 2 is a grid of Pokémon)
**Date:** 2026-11-04
**Spec:** [screenshot-first design](../design/screenshot-first.md), "What the player does"
**Deciders:** project owner, Claude

## Context

The planner should make sense to players who know nothing about IVs, stat product or
CP caps. Screenshots are the main way in (screenshot-first design). Even so, the page
opens on about 25 fields per Pokémon, plus resources, with two similar file pickers
and no order to follow. A new player can't tell where to start, which screenshots the
planner wants, or which fields matter.

## Decision

- The page is **three numbered steps**, in one form:
  1. **Add screenshots.** Lists the screens to take: each Pokémon's screen, scrolled
     down as well; its appraisal; and optionally the item bag and profile. Holds the
     shared picker (ADR 0010 shares land here too). A button below it, "No
     screenshots? Type the details in instead", is the way in for typing.
  2. **Check the details.** The target, both Pokémon and the resources, as before.
     A short note says whether they were read from screenshots or are to be typed in.
  3. **See the answer.** The submit button, any error, and the results (ADR 0003).
- Steps 2 and 3 start **hidden**. They appear once screenshots have been read (or
  turned out to hold no Pokémon, so the player can type them in), once two Pokémon are
  picked from several, or when the player asks to type.
- They are never hidden again. Adding screenshots later still fills the fields in
  place.
- Showing a step only toggles `hidden`; no field is moved or rebuilt, so all form
  reading stays as it is. The logic is in `src/ui/steps.ts`; `wireScreenshots` gains
  an `onDone` callback for when its reading has finished.
- After a successful comparison, the results are scrolled into view, because on a
  phone they are below a long form.

### Amendment (2026-11-04): a saved grid opens the later steps

Since 0015 the grid is kept on the device. On the next visit it came back hidden in
step 2, which opened only after a new screenshot was read; a player starting a new
evolution line found the old Pokémon only after uploading, and the only Clear all
button was in step 2, so they had to clear and upload again.

- When a grid with Pokémon in it is restored, step 1 says so first: "Saved from last
  time: 2 Pokémon (Palossand). New screenshots join them.", with a **Clear and start
  again** button that does what Clear all does (0015).
- Steps 2 and 3 open at once, so the saved tiles can be checked and compared without
  a new screenshot. With nothing saved, a visit opens on step 1 alone as before.
- Clearing hides the note. The later steps stay open; new screenshots fill them.
- Clear all also moved from below the resources to beside the "Your Pokémon" heading.

## Consequences

- A first visit shows only step 1: a short list of what to do and one button.
- Typing in everything takes one more tap than before.
- The per-Pokémon pickers stay inside step 2, for adding a screenshot of one Pokémon.
  (Replaced by 0015: step 1 is the only picker.)
- Hiding fields with `hidden` keeps them in the DOM, so tests and form code are
  unaffected. Progressive disclosure inside step 2 (advanced options, help for terms)
  is a separate change.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| A wizard: one step on screen at a time, with Next/Back | Least on screen | Correcting a value means going back; more state | Players move between checking and the answer often |
| Keep one long form, add numbered headings only | No hidden state | Still opens on 50+ fields | Doesn't fix where to start |
| Separate pages per step | Clear URLs | Needs routing or state passed between pages | The app is one static page (0004) |

## Links

- Supersedes: N/A
- Superseded in part by: 0015
- Related: 0003, 0008, 0010, [screenshot-first design](../design/screenshot-first.md)

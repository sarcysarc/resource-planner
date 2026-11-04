# What the game screens show

Notes from browsing a real account over adb (720×1604 phone, 2026-11-03). They
feed the screenshot-first design. Players scroll to different positions, so every
value below is found by its **label text**, never by where it sits on screen.

## Pokémon screen

| Value | How to find it | Notes |
|-------|----------------|-------|
| CP | "CP" + digits at the top | Often hidden by the Pokémon's model (Dragonite, Mewtwo) or a bright background. Treat as optional; CP can be worked out from IVs + level. |
| Name | Large text above the HP bar, with a pencil icon | Can be a nickname (seen: "Snorlax100"). Use the appraisal footer for the species. |
| HP | `X / Y HP` | Use Y. X is current HP (0 when fainted). |
| Types | `TYPE / TYPE` above "WEIGHT"/"HEIGHT" | Labels can read "HEAVIEST"/"TALLEST"/"LIGHTEST" for size extremes. |
| Stardust total | number above "STARDUST" | |
| Candy total | number above "<FAMILY> CANDY" | Family name, not species: Dragonite shows "DRATINI CANDY". |
| Candy XL total | number above "<FAMILY> CANDY XL" | Only shown when above 0. Label may wrap over two lines. Mega Energy may sit beside it. |
| Power-up cost | numbers after "POWER UP" | Stardust then Candy (or XL above level 40). |
| Evolve cost | number after "EVOLVE" | Missing on final evolutions. Red when unaffordable. |
| Second move | "NEW ATTACK" + Stardust + Candy | Present means the second charged move is still locked. Cost also tells the cost tier (50k/50, 75k/75, 100k/100). Once unlocked the button is gone and two charged moves are listed (Aggron: Stone Edge, Thunder). |
| Moves | lines after "GYMS & RAIDS" | Power may show as "95+19" (weather or shadow bonus). |
| Origin | "CAUGHT IN THE WILD", "CAUGHT AFTER DEFEATING GRUNT", "CAUGHT AT A MEGA RAID", … | Next lines show location and date; never store or show these. |

## Shadow and purified

- **Shadow:** a "PURIFY" button and "SHADOW BONUS" under the moves. Purple flames
  around the model.
- **Purified:** no badge on the Pokémon screen. Signs are the move **Return** and
  "CAUGHT AFTER DEFEATING GRUNT" with no PURIFY button. The list view shows a
  light-blue sparkle next to the Pokémon.
- **Lucky:** the text "LUCKY POKÉMON" under the name, and a gold sparkly
  background. Lucky Pokémon power up for half the Stardust, so this matters for
  costs.

## How OCR reads them (S2 readers)

Checked against every local screenshot. The readers live in `src/core/screen/`.

- **Origin labels** come with icon junk in front ("& CAUGHT IN THE WILD 1)") or
  garbled ("¥ CAUGHT ATTIC N"), and sometimes are not read at all. The privacy
  filter finds the label anywhere in the line, and also drops any "Town, Region"
  line (no digits) plus a wrapped last word, label or not.
- **Shadow:** "PURIFY", or "SHADOW BONUS" read as "SHADOW BONLIS"/"sHapow BONUS".
- **Purified:** "Return" plus "GRUNT", and no Shadow sign. Purified evolve costs are
  10% lower ("EVOLVE 45" for a 50 Candy evolution).
- **Lucky:** "LUCKY POKEMON", usually without the accent. Its absence proves
  nothing, so the Lucky box is only ever ticked, never unticked.
- **Second move:** locked when "NEW ATTACK" or a matching cost ("§90,000 £90",
  same thousands of Stardust as Candy) shows under the moves. NEW can be lost on
  the button's gradient, so "ATTACK" in capitals before a thousands price counts
  too; the price doesn't always match the Candy ("10,000 25").
- **POWER UP** can be lost the same way. The move tabs ("GYMS & RAIDS", "TRAINER
  BATTLES") also mark the Pokémon screen, so a scrolled-down screenshot still counts.
- **CP band:** on a scrolled-down screenshot the band holds other text ("135,770",
  "2.68kg"), so its number counts only when the HP line shows too. A number after
  "CP" in the words counts anywhere. The band can misread a digit ("CP714" as
  "cr/14"); the CP field then needs fixing by hand. Unlocked only when
  three move lines are followed straight away by the origin label; a garbled
  line in between ("TE", "ck mon") may be an unread NEW ATTACK, so it gives no answer.
- **Evolve:** "EVOLVE" then a number. Ignore it when "MEGA" is on that line or the
  one above (Mega Evolve shares the label). A Candy icon can read as a leading
  digit ("9100").
- **Name** over the HP line can be junk ("LJ") or a nickname; names under three
  letters are ignored. Then the Candy family ("STARDUST ARON CANDY" → Aron, Lairon,
  Aggron) is narrowed by which members could show the CP and HP. On iPhone JPEGs
  the family is often cut short ("RLAX") and gives nothing.

## How OCR reads the totals (S3)

- Each total sits above its label: STARDUST, "<FAMILY> CANDY" and
  "<FAMILY> CANDY XL". The digits pass reads a teal-only crop above the label.
- The family name can wrap onto the line above CANDY ("GROWLITHE" / "CANDY XL"),
  so the crop covers both lines but is one line tall. If the family is lost, the
  word above CANDY may be the total itself, so only a word of three or more
  letters counts as the family.
- STARDUST can read as "TARDUST".
- Candy XL icons have dark grey or brown stripes that passed the plain teal test
  and turned 22 into "2". Teal text has a blue-green tint (green and blue at least
  16 above red); the stripes have almost none.
- The Stardust icon can read as a leading "1" ("1135,770"). Grouped digits can't
  start with four, so the well-formed tail is kept.
- The XL row only shows when there is some XL Candy. With the Candy label and the
  POWER UP or PURIFY button on screen and no XL label between them, XL is 0.
  Without the button the row may just be off screen, so it gives no answer.
- Candy and XL fill only when the Pokémon shares the target's Candy family.
  Stardust is the account's, so it always fills.
- On appraisal screens (adb and iPhone) no totals are read yet: the labels are
  dimmed or covered by the team leader.

## Several screenshots (S4)

Checked on two Aggrons and an Aron from one family, each screenshotted at the top
and scrolled down, in that order. All six sorted into three Pokémon, two
screenshots each. A fainted Pokémon shows "0 / 140 HP"; the second number is
the one read. Grouping leans on file times, so screenshots picked out of order
can pair a scrolled-down screenshot with the wrong family member when the power-up
costs match.

## Appraisal screen

- Overlays the top half of the Pokémon screen, so name, HP, types and the Stardust
  total stay readable; Candy may be covered by the team leader.
- Footer: "This <Species> was caught on <date> around <place>." The species here is
  the real one even if the Pokémon is nicknamed. The place must be ignored.
- Three bars (Attack, Defense, HP) read from pixels (ADR 0008). A full bar is
  pink-red, not orange; a 15/15/15 Pokémon also gets a pink badge.
- Left/right arrows step through the current list; the first item has no left arrow.

## Other devices

Seven iPhone screenshots (942×2048 JPEG, all appraisals) were checked too. The
layout is the same but the aspect ratio differs, and the team leader covers the
right half of the resources. The existing bar reader got all 21 IVs right on
them at the current tolerance, despite JPEG compression.

## Search strings

Tried in the in-game Pokémon search (286 Pokémon on this account):

- `!@3move` lists Pokémon whose **second charged move is unlocked** (4 here:
  Aggron, Greninja, Arcanine, Serperior; Aggron and Arcanine checked by hand).
  This is the opposite of what the name suggests: `@3move` returns the 280 that
  are still locked. The two sets add up to 284, so 2 Pokémon are in neither,
  probably ones that can't learn a second move.
- A "SHOW EVOLUTIONARY LINE" toggle appears under the search box, and the
  header shows the match count, e.g. "(4)".

Other terms, with counts on this account:

| Term | Count | Use for planning |
|------|-------|------------------|
| `shadow` | 9 | Power-ups cost 20% more |
| `purified` | 6 | Power-ups cost 10% less |
| `lucky` | 0 | Half Stardust (none on this account) |
| `4*` | 3 | Hundos only |
| `3*` | 235 | Strong IVs |
| `evolve` | 78 | Can evolve now |
| `megaevolve` | 32 | |
| `tradeevolve` | 7 | Evolve free after a trade |
| `buddy4` | 0 | Near the Best Buddy +1 level |
| `xxl` | 8 | Size label |

List tiles also show markers: a purple flame for shadow, a light-blue sparkle
for purified, dark sparkles for shiny, a gold star for favourite, and a speech
bubble on the buddy.

## Item bag

Under "OTHER ITEMS", each item has a name and a count like "x51" on its icon.
The ones that matter are **Rare Candy** (x51) and **Rare Candy XL** (x38). They
can be turned into any family's Candy, so they add to every budget. The bag
scrolls, so find them by name.

## Trainer and buddy

- **Trainer level** shows on the map, bottom-left ("42"), and on the profile
  ("42 LEVEL"). It caps how far a Pokémon can be powered up: Pokémon level is
  at most trainer level + 10, up to 50.
- **Buddy:** tapping the buddy portrait on the map opens a screen with the
  species name and five hearts at the top. The number filled in gives the
  buddy level; Best Buddy adds one Pokémon level.

The app could suggest search strings like this so players can find the right
Pokémon to screenshot.

## Popups

A "New Mega Level available!" card can cover the lower half on first open. A
screenshot taken then hides the resources and costs.

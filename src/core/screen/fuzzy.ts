// Labels on the dimmed or colourful parts of a screen come out a letter or two wrong
// ("CANLY", "SEAR LUST"), so totals labels are matched loosely (ADR 0009).

/** Edit distance between two strings. */
export function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (const [i, ca] of [...a].entries()) {
    const next = [i + 1];
    for (const [j, cb] of [...b].entries()) next.push(Math.min(row[j + 1] + 1, next[j] + 1, row[j] + (ca === cb ? 0 : 1)));
    row = next;
  }
  return row[b.length];
}

/** Whether normalised text is the label, allowing one wrong letter in four. */
export const isNear = (text: string, label: string) => distance(text, label) <= Math.floor(label.length / 4);

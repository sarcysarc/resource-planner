import { textLines } from './anchors';
import type { Word } from './types';

// Origin labels such as "CAUGHT IN THE WILD"; the place and date follow on the next lines.
const ORIGIN = /^(CAUGHT|HATCHED|RECEIVED|OBTAINED|TRADED)\b/;
const DATE = /\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}/;
const MAX_ORIGIN_LINES = 3;

// How many lines after an origin label hold location: up to the date, at most three.
function originSpan(lines: string[], at: number): number {
  const date = lines.slice(at + 1, at + 1 + MAX_ORIGIN_LINES).findIndex((line) => DATE.test(line));
  return date === -1 ? MAX_ORIGIN_LINES : date + 1;
}

function hiddenLines(words: Word[]): Set<number> {
  const order = [...new Set(words.map((w) => w.line))].sort((a, b) => a - b);
  const lines = textLines(words);
  const hidden = new Set<number>();
  lines.forEach((line, at) => {
    if (!ORIGIN.test(line)) return;
    order.slice(at + 1, at + 1 + originSpan(lines, at)).forEach((n) => hidden.add(n));
  });
  return hidden;
}

// The appraisal footer ends "… around <place>", which can wrap onto the next line.
function footerCut(words: Word[]): { line: number; index: number } | undefined {
  const index = words.findIndex((w) => w.text.toLowerCase() === 'around');
  return index === -1 ? undefined : { line: words[index].line, index };
}

/** Removes every word that could tell where a Pokémon was caught. */
export function dropLocation(words: Word[]): Word[] {
  const hidden = hiddenLines(words);
  const cut = footerCut(words);
  return words.filter((w, i) => {
    if (hidden.has(w.line)) return false;
    return !cut || i < cut.index || w.line > cut.line + 1;
  });
}

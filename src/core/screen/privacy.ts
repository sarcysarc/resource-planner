import { textLines } from './anchors';
import type { Word } from './types';

// Origin labels such as "CAUGHT IN THE WILD"; the place and date follow on the next lines.
// OCR often puts icon junk before the label, so it may sit anywhere in the line.
const ORIGIN = /\b(CAUGHT|HATCHED|RECEIVED|OBTAINED|TRADED)\b/;
// "Town, Region" with no digits: a place even when its origin label was not read.
const PLACE = /^[^\d,]*[A-Z][a-z][^\d,]*,\s*[A-Z][^\d]*$/;
// The end of a place that wrapped, such as a country's second word.
const PLACE_END = /^[A-Z][a-z]+( [A-Z][a-z]+)?$/;

// Lines holding a place that is not under an origin label: the place and its wrapped end.
function placeSpan(lines: string[], at: number): number {
  if (!PLACE.test(lines[at])) return 0;
  return PLACE_END.test(lines[at + 1] ?? '') ? 2 : 1;
}
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
    const [from, span] = ORIGIN.test(line) ? [at + 1, originSpan(lines, at)] : [at, placeSpan(lines, at)];
    order.slice(from, from + span).forEach((n) => hidden.add(n));
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

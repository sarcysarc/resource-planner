import { above, findLabel, norm, overlapsX, union } from './anchors';
import type { Box, Region, Scan, TotalName, Totals, Word } from './types';

// Words that are part of a label, so never the family name in front of CANDY.
const LABEL_WORDS = new Set(['STARDUST', 'TARDUST', 'CANDY', 'XL']);
// Commas must group thousands properly, so "12,34" is a misread.
const NUMBER = /^(\d{1,3}(,\d{3})+|\d+)$/;
const BUTTONS = /^(POWER|PURIFY)$/;

const height = (box: Box) => box.y1 - box.y0;
const isXl = (words: Word[], at: number) => norm(words[at + 1]?.text ?? '') === 'XL' && words[at + 1].line === words[at].line;

// The family name before CANDY: earlier on its line, or wrapped onto the line above it.
function family(words: Word[], at: number): Word | undefined {
  const before = words[at - 1];
  if (before?.line === words[at].line && !LABEL_WORDS.has(norm(before.text))) return before;
  const isName = (w: Word) => /^[A-Z]{3,}$/.test(norm(w.text)) && !LABEL_WORDS.has(norm(w.text));
  return words.find((w) => w.line === words[at].line - 1 && overlapsX(w.box, words[at].box) && isName(w));
}

// Where a total sits: above its label, measured by one line of the label's text.
function regionAbove(words: Word[], at: number): Region {
  const name = family(words, at);
  const label = name ? union(name.box, words[at].box) : words[at].box;
  return { box: above(label, height(words[at].box)), ink: 'teal' };
}

function stardustLabel(words: Word[]): Box | undefined {
  return findLabel(words, 'STARDUST') ?? words.find((w) => norm(w.text) === 'TARDUST')?.box;
}

/** Areas holding the Stardust, Candy and Candy XL totals, to read again as digits. */
export function totalRegions(words: Word[]): Partial<Record<TotalName, Region>> {
  const regions: Partial<Record<TotalName, Region>> = {};
  const dust = stardustLabel(words);
  if (dust) regions.stardust = { box: above(dust), ink: 'teal' };
  for (const [at, w] of words.entries()) {
    if (norm(w.text) !== 'CANDY') continue;
    const name = isXl(words, at) ? 'xl' : 'candy';
    regions[name] ??= regionAbove(words, at);
  }
  return regions;
}

// An icon left of a total can read as an extra leading digit ("1135,770"). Grouped
// digits cannot start with four, so the well-formed tail is the number.
const GROUPED_TAIL = /\d{1,3}(,\d{3})+$/;
const repair = (token: string) => (NUMBER.test(token) ? token : token.match(GROUPED_TAIL)?.[0]);

/** The longest well-formed number in a digits read. */
function count(text = ''): number | undefined {
  const tokens = (text.match(/[\d,]+/g) ?? []).flatMap((t) => repair(t) ?? []);
  const longest = tokens.sort((a, b) => b.length - a.length)[0];
  return longest === undefined ? undefined : Number(longest.replaceAll(',', ''));
}

// The XL row shows only when there is some XL Candy, so its absence between the
// Candy label and the buttons means 0. Without the buttons it may just be covered.
function noXlRow(words: Word[]): boolean {
  const candy = words.find((w, at) => norm(w.text) === 'CANDY' && !isXl(words, at));
  const button = words.find((w) => BUTTONS.test(norm(w.text)));
  if (!candy || !button) return false;
  return !words.some((w) => w.line > candy.line && w.line < button.line && norm(w.text) === 'XL');
}

/** Stardust, Candy and Candy XL totals from the second-pass digits. */
export function readTotals(scan: Scan): Totals {
  const totals: Totals = {};
  for (const name of ['stardust', 'candy', 'xl'] as const) {
    const value = count(scan.digits[name]);
    if (value !== undefined) totals[name] = value;
  }
  if (totals.xl === undefined && totals.candy !== undefined && noXlRow(scan.words)) totals.xl = 0;
  return totals;
}

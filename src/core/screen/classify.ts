import { findLabel, textLines } from './anchors';
import type { ScreenKind, Word } from './types';

export const HP = /(\d{1,4})\s*\/\s*(\d{1,4})\s*HP/i;
const MOVE_TABS = /\bGYMS\b|TRAINER BATTLES/i;

const has = (words: Word[], label: string) => findLabel(words, label) !== undefined;
const anyLine = (words: Word[], pattern: RegExp) => textLines(words).some((line) => pattern.test(line));

// Each kind and the anchor words that give it away; see docs/screens.md.
const SIGNS: [ScreenKind, (words: Word[]) => boolean][] = [
  // The move tabs stay when OCR misses POWER UP on its gradient and HP is scrolled away.
  ['pokemon', (w) => has(w, 'POWER UP') || anyLine(w, HP) || anyLine(w, MOVE_TABS)],
  ['appraisal', (w) => anyLine(w, /was caught on/i)],
  ['bag', (w) => has(w, 'OTHER ITEMS')],
  ['profile', (w) => has(w, 'LEVEL') && has(w, 'TOTAL ACTIVITY')],
];

/** Which screens a screenshot shows. An appraisal is also a Pokémon screen underneath. */
export function classify(words: Word[]): ScreenKind[] {
  return SIGNS.filter(([, sign]) => sign(words)).map(([kind]) => kind);
}

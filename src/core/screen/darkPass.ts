// The dark-ink pass reads the small grey labels the plain pass misses: the family, the
// totals, the costs. It takes half of each screenshot's time, so it runs only where the
// 2026-11-04 stress test showed the plain pass can miss something (fix E).
import { textLines } from './anchors';
import { classify, HP } from './classify';
import { readName } from './identity';
import type { Word } from './types';

/**
 * Whether to read a dark-ink copy too, from what the plain pass read and whether IV bars
 * show. An appraisal needs only its name and HP, which are white; a screen the plain pass
 * shows is no Pokémon, bag or profile has nothing to read. Any other screen needs it.
 */
export function needsDarkPass(plain: Word[], bars: boolean): boolean {
  const lines = textLines(plain);
  if (bars) return readName(lines) === undefined || !lines.some((line) => HP.test(line));
  return classify(plain).length > 0;
}

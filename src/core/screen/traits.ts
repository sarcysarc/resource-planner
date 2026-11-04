import { SHOWN_COSTS } from '../evolveCandy';
import type { Modifiers } from '../types';

const PURIFY = /\bPURIFY\b/;
// "SHADOW BONUS" under the moves; OCR reads it as "SHADOW BONLIS" or "sHapow BONUS".
const SHADOW_BONUS = /\bSHA[DP]OW\s*BON/i;
const RETURN = /\bReturn\b/;
const GRUNT = /\bGRUNT\b/;
const LUCKY = /\bLUCKY\s+POK[EÉ]MON\b/i;
const EVOLVE = /\bEVOLVE\b\D*(\d{2,4})\b/;
const MEGA = /\bMEGA\b/i;


const some = (lines: string[], pattern: RegExp) => lines.some((line) => pattern.test(line));

/** Shadow or Purified when the screen shows it; undefined when it cannot tell. */
export function readVariant(lines: string[]): Modifiers['variant'] | undefined {
  if (some(lines, PURIFY) || some(lines, SHADOW_BONUS)) return 'shadow';
  if (some(lines, RETURN) && some(lines, GRUNT)) return 'purified';
  return undefined;
}

/** True when the Lucky label shows. Its absence proves nothing: it may be off screen. */
export function readLucky(lines: string[]): true | undefined {
  return some(lines, LUCKY) || undefined;
}

// A Candy icon is sometimes read as a leading digit ("9100" for 100).
function evolveCost(digits: string): number | undefined {
  return [digits, digits.slice(1)].map(Number).find((n) => SHOWN_COSTS.has(n));
}

/** Candy for the next evolution, from the EVOLVE button. Mega Evolution is not counted. */
export function readEvolveCandy(lines: string[]): number | undefined {
  const at = lines.findIndex((line) => EVOLVE.test(line));
  if (at === -1 || MEGA.test(lines[at]) || MEGA.test(lines[at - 1] ?? '')) return undefined;
  return evolveCost(EVOLVE.exec(lines[at])![1]);
}

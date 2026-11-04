import { MAX_POWER_UP_LEVEL } from '../data/powerUpCosts';
import { powerUpCost } from './cost';
import { halfLevels } from './levels';
import type { Modifiers } from './types';

/** Values read off the Pokémon screen; each is missing when it could not be found. */
export interface ScreenReading {
  cp?: number;
  hp?: number;
  dust?: number;
}

const CP = /CP\s*(\d{2,5})/i;
const HP = /(\d{1,4})\s*\/\s*(\d{1,4})\s*HP/i;

const numbers = (line: string) => [...line.matchAll(/\d{1,3}(?:,\d{3})+|\d+/g)].map((m) => Number(m[0].replaceAll(',', '')));

function validCosts(mods: Modifiers): Set<number> {
  const levels = halfLevels(1, MAX_POWER_UP_LEVEL - 0.5);
  return new Set(levels.map((from) => powerUpCost({ from, to: from + 0.5, mods }).stardust));
}

// The cost sits on the POWER UP button: the same line, or the next one if OCR split it.
function readDust(lines: string[], mods: Modifiers): number | undefined {
  const at = lines.findIndex((line) => /POWER\s*UP/i.test(line));
  if (at === -1) return undefined;
  const costs = validCosts(mods);
  return numbers(lines.slice(at, at + 2).join(' ')).find((n) => costs.has(n));
}

/** Pulls CP, maximum HP and the next power-up's Stardust out of OCR text. */
export function readScreen(text: string, mods: Modifiers): ScreenReading {
  const cp = CP.exec(text)?.[1];
  const hp = HP.exec(text)?.[2];
  const reading: ScreenReading = {
    cp: cp === undefined ? undefined : Number(cp),
    hp: hp === undefined ? undefined : Number(hp),
    dust: readDust(text.split('\n'), mods),
  };
  return Object.fromEntries(Object.entries(reading).filter(([, v]) => v !== undefined));
}

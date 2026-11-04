import type { Modifiers } from '../types';
import { textLines } from './anchors';
import { classify } from './classify';
import { readFamily, readName } from './identity';
import { readSecondMove } from './moves';
import { readPokemon } from './pokemon';
import { readEvolveCandy, readLucky, readVariant } from './traits';
import type { Details, Reading, Scan } from './types';

// Drops the details that were not found, so the form only changes where the screen says so.
function defined<T extends object>(values: T): Partial<T> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function readDetails(lines: string[]): Details {
  return defined({
    name: readName(lines),
    family: readFamily(lines),
    variant: readVariant(lines),
    lucky: readLucky(lines),
    secondMove: readSecondMove(lines),
    evolveCandy: readEvolveCandy(lines),
  });
}

/** Everything read from one screenshot. Unknown screens give nothing, so stray numbers never fill the form. */
export function readScan(scan: Scan, mods: Modifiers): Reading {
  const kinds = classify(scan.words);
  if (!kinds.includes('pokemon') && !kinds.includes('appraisal')) return scan.ivs ? { ivs: scan.ivs } : {};
  const details = readDetails(textLines(scan.words));
  // What the screen shows beats the form when judging which Stardust costs exist.
  const seen = { variant: details.variant ?? mods.variant, lucky: details.lucky ?? mods.lucky };
  const reading = { ...readPokemon(scan, seen), ...details };
  return scan.ivs ? { ...reading, ivs: scan.ivs } : reading;
}

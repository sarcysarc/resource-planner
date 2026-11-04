import type { Modifiers } from '../types';
import { readBag, readTrainerLevel } from './account';
import { textLines } from './anchors';
import { classify } from './classify';
import { readFamily, readName } from './identity';
import { readSecondMove } from './moves';
import { readPokemon } from './pokemon';
import { readTotals } from './totals';
import { readEvolveCandy, readLucky, readVariant } from './traits';
import type { Details, Reading, Scan, ScreenKind, Totals } from './types';

// Drops the details that were not found, so the form only changes where the screen says so.
function defined<T extends object>(values: T): Partial<T> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function readDetails(lines: string[], scan: Scan): Details {
  return defined({
    name: readName(lines),
    family: readFamily(lines),
    variant: readVariant(lines),
    lucky: readLucky(lines),
    secondMove: readSecondMove(lines),
    evolveCandy: readEvolveCandy(lines, scan.digits.evolve),
  });
}

// The bag and the profile hold account-wide values only.
function readAccount(scan: Scan, kinds: ScreenKind[]): Reading {
  const totals: Totals = kinds.includes('bag') ? readBag(scan.words) : {};
  const level = kinds.includes('profile') ? readTrainerLevel(scan.digits.trainerLevel) : undefined;
  if (level !== undefined) totals.trainerLevel = level;
  return Object.keys(totals).length ? { totals } : {};
}

/** Everything read from one screenshot. Unknown screens give nothing, so stray numbers never fill the form. */
export function readScan(scan: Scan, mods: Modifiers): Reading {
  const kinds = classify(scan.words);
  if (kinds.includes('bag') || kinds.includes('profile')) return readAccount(scan, kinds);
  if (!kinds.includes('pokemon') && !kinds.includes('appraisal')) return scan.ivs ? { ivs: scan.ivs } : {};
  const details = readDetails(textLines(scan.words), scan);
  // What the screen shows beats the form when judging which Stardust costs exist.
  const seen = { variant: details.variant ?? mods.variant, lucky: details.lucky ?? mods.lucky };
  const totals = readTotals(scan);
  const reading: Reading = { ...readPokemon(scan, seen), ...details };
  if (Object.keys(totals).length) reading.totals = totals;
  return scan.ivs ? { ...reading, ivs: scan.ivs } : reading;
}

import type { Modifiers } from '../types';
import { classify } from './classify';
import { readPokemon } from './pokemon';
import type { Reading, Scan } from './types';

/** Everything S1 reads from one screenshot. Unknown screens give nothing, so stray numbers never fill the form. */
export function readScan(scan: Scan, mods: Modifiers): Reading {
  const kinds = classify(scan.words);
  const known = kinds.includes('pokemon') || kinds.includes('appraisal');
  const reading = known ? readPokemon(scan, mods) : {};
  return scan.ivs ? { ...reading, ivs: scan.ivs } : reading;
}

import { MAX_POWER_UP_LEVEL } from '../../data/powerUpCosts';
import { powerUpCost } from '../cost';
import { halfLevels } from '../levels';
import type { Modifiers } from '../types';
import { findLabel, rightOf, textLines } from './anchors';
import { HP } from './classify';
import type { Reading, Region, RegionName, Scan, Word } from './types';

// OCR often reads the small CP letters as "cpr" or "cr".
const CP = /C[PR]{1,2}\s*(\d{2,5})/i;
const POWER_UP = /POWER\s*UP/i;

const numbers = (text: string) => [...text.matchAll(/\d{1,3}(?:,\d{3})+|\d+/g)].map((m) => Number(m[0].replaceAll(',', '')));

function validCosts(mods: Modifiers): Set<number> {
  const levels = halfLevels(1, MAX_POWER_UP_LEVEL - 0.5);
  return new Set(levels.map((from) => powerUpCost({ from, to: from + 0.5, mods }).stardust));
}

// First pass: the cost is on the POWER UP line, or the next one if OCR split it.
function firstPassCost(lines: string[]): string {
  const at = lines.findIndex((line) => POWER_UP.test(line));
  return at === -1 ? '' : lines.slice(at, at + 2).join(' ');
}

function readDust(scan: Scan, lines: string[], mods: Modifiers): number | undefined {
  const costs = validCosts(mods);
  const pick = (text: string) => numbers(text).find((n) => costs.has(n));
  return pick(scan.digits.cost ?? '') ?? pick(firstPassCost(lines));
}

/** CP from the cropped CP band (see `cpBand`): the first number in it. */
export function readCp(bandText: string): number | undefined {
  const digits = /\d{2,5}/.exec(bandText)?.[0];
  return digits === undefined ? undefined : Number(digits);
}

/** Areas of the Pokémon screen worth reading again, digits only. */
export function pokemonRegions(words: Word[]): Partial<Record<RegionName, Region>> {
  const powerUp = findLabel(words, 'POWER UP');
  return powerUp ? { cost: { box: rightOf(powerUp), ink: 'white' } } : {};
}

/** CP, maximum HP and the next power-up's Stardust from the Pokémon screen. */
export function readPokemon(scan: Scan, mods: Modifiers): Reading {
  const lines = textLines(scan.words);
  const text = lines.join('\n');
  const cp = readCp(scan.cpText) ?? CP.exec(text)?.[1];
  const hp = HP.exec(text)?.[2];
  const reading: Reading = {
    cp: cp === undefined ? undefined : Number(cp),
    hp: hp === undefined ? undefined : Number(hp),
    dust: readDust(scan, lines, mods),
  };
  return Object.fromEntries(Object.entries(reading).filter(([, v]) => v !== undefined));
}

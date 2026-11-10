import { MAX_POWER_UP_LEVEL } from '../../data/powerUpCosts';
import { powerUpCost } from '../cost';
import { halfLevels } from '../levels';
import type { Modifiers } from '../types';
import { findLabel, rightOf, textLines } from './anchors';
import { HP } from './classify';
import { CP, cpOptions, readCp } from './cpBand';
import type { Reading, Region, RegionName, Scan, Word } from './types';

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

// The game shows some Shadow costs one above the table (1,921 for 1,920), so for a
// Shadow a number one above a real cost stands for it.
function readDust(scan: Scan, lines: string[], mods: Modifiers): number | undefined {
  const costs = validCosts(mods);
  const slack = mods.variant === 'shadow' ? [0, 1] : [0];
  const cost = (n: number) => slack.map((s) => n - s).find((c) => costs.has(c));
  const pick = (text: string) => numbers(text).map(cost).find((c) => c !== undefined);
  return pick(scan.digits.cost ?? '') ?? pick(firstPassCost(lines));
}

/** Areas of the Pokémon screen worth reading again, digits only: the buttons' costs. */
export function pokemonRegions(words: Word[]): Partial<Record<RegionName, Region>> {
  const [powerUp, evolve] = [findLabel(words, 'POWER UP'), findLabel(words, 'EVOLVE')];
  return {
    ...(powerUp && { cost: { box: rightOf(powerUp), ink: 'cost' } }),
    ...(evolve && { evolve: { box: rightOf(evolve), ink: 'cost' } }),
  };
}

interface BandCp {
  cp?: number;
  options: number[];
}

// The first band's CP leads. The bright band (issue #5) gives the CP only when the first has
// none and its number sits by the CP label; a bare number may have lost digits to a sparkle
// erased beside it, so it, like every other reading, is only an option for the check (fix C).
function bandCp({ cpText, cpBright = '' }: Scan): BandCp {
  const labelled = CP.test(cpBright) ? readCp(cpBright) : undefined;
  const cp = readCp(cpText) ?? labelled;
  const all = [...cpOptions(cpText), readCp(cpBright), ...cpOptions(cpBright)];
  const options = [...new Set(all)].filter((n): n is number => n !== undefined && n !== cp);
  return { cp, options };
}

/** CP, maximum HP and the next power-up's Stardust from the Pokémon screen. */
export function readPokemon(scan: Scan, mods: Modifiers): Reading {
  const lines = textLines(scan.words);
  const text = lines.join('\n');
  const hp = HP.exec(text)?.[2];
  // The band shows CP only on the top of the screen, which also shows HP; scrolled
  // further, it holds other numbers, or the HP line itself. A number labelled CP is
  // trusted anywhere. An appraisal (IV bars) shows the top, but on a Lucky's gold
  // background the band can be junk, so there the CP label must show too.
  const top = hp !== undefined || (scan.ivs !== undefined && CP.test(scan.cpText));
  const useBand = top && !HP.test(scan.cpText);
  const band: BandCp = useBand ? bandCp(scan) : { options: [] };
  const cp = band.cp ?? CP.exec(text)?.[1];
  // The species, not known yet, settles which reading is right (fix C).
  const options = band.options;
  const reading: Reading = {
    cp: cp === undefined ? undefined : Number(cp),
    cpOptions: options.length ? options : undefined,
    hp: hp === undefined ? undefined : Number(hp),
    dust: readDust(scan, lines, mods),
  };
  return Object.fromEntries(Object.entries(reading).filter(([, v]) => v !== undefined));
}

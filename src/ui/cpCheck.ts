// Checks a screenshot's CP against its species and HP before it is sorted into Pokémon
// (fix C of the 2026-11-04 stress test): OCR loses or misreads CP digits on busy backgrounds,
// and a wrong CP would make a Pokémon of its own.
import { reachableCps } from '../core/reachableCp';
import type { Reading } from '../core/screen/types';
import { resolveSpecies } from './scanSpecies';
import type { Species, SpeciesIndex } from './species';

const MAX_CP = 9999;
const DIGITS = [...'0123456789'];
const only = (cps: number[]) => (new Set(cps).size === 1 ? cps[0] : undefined);
const shownAs = (s: Species) => s.name.replace(/\s*\(.*\)$/, '');

// The game shows some forms by the plain name ("Mewtwo" for Armored Mewtwo), so each counts.
function formsShownAs(index: SpeciesIndex, species: Species[]): Species[] {
  const names = new Set(species.map(shownAs));
  return index.all.filter((s) => names.has(shownAs(s)));
}

// Every CP one digit off: a digit added anywhere, or one changed.
function nearCps(cp: number): number[] {
  const text = String(cp);
  const at = [...Array(text.length + 1).keys()];
  const added = at.flatMap((i) => DIGITS.map((d) => text.slice(0, i) + d + text.slice(i)));
  const changed = at.slice(0, -1).flatMap((i) => DIGITS.map((d) => text.slice(0, i) + d + text.slice(i + 1)));
  return [...added, ...changed].filter((t) => !t.startsWith('0')).map(Number).filter((n) => n !== cp && n <= MAX_CP);
}

// The CPs the species could show with the HP and IVs read. The Stardust cost is left out: a
// Lucky the screen didn't show as one has its cost halved, which would rule out its real CP.
function fittingCps(index: SpeciesIndex, reading: Reading): Set<number> | undefined {
  if (reading.hp === undefined) return undefined;
  const species = formsShownAs(index, resolveSpecies(index, { ...reading, cp: undefined }));
  if (!species.length) return undefined;
  const mods = { variant: reading.variant ?? 'normal', lucky: reading.lucky ?? false };
  const seen = { mods, hp: reading.hp, ivs: reading.ivs };
  return new Set(species.flatMap((s) => [...reachableCps({ ...seen, base: s.base })]));
}

// The band's other readings first; else the one CP a digit off any of them that fits.
function repair(fits: Set<number>, read: number | undefined, options: number[]): number | undefined {
  const fitting = (cps: number[]) => cps.filter((cp) => fits.has(cp));
  const near = [read, ...options].filter((cp) => cp !== undefined).flatMap(nearCps);
  return only(fitting(options)) ?? only(fitting(near));
}

/**
 * The reading with a CP that fits its species and HP: as read, another way the band reads,
 * or one digit off. When none or several fit, the CP is left out and kept as `cpDoubt`.
 */
export function checkCp(index: SpeciesIndex, reading: Reading): Reading {
  const { cpOptions = [], cp: read, ...rest } = reading;
  const fits = fittingCps(index, rest);
  if (!fits || (read !== undefined && fits.has(read))) return read === undefined ? rest : { ...rest, cp: read };
  const cp = repair(fits, read, cpOptions);
  if (cp !== undefined) return { ...rest, cp };
  return read === undefined ? rest : { ...rest, cpDoubt: read };
}

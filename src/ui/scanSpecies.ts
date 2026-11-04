import { inferSpreads } from '../core/infer';
import { isNear } from '../core/screen/fuzzy';
import type { Reading } from '../core/screen/types';
import { findSpecies, type Species, type SpeciesIndex } from './species';

const sameIvs = (a: Reading['ivs'], b: Reading['ivs']) => a!.atk === b!.atk && a!.def === b!.def && a!.hp === b!.hp;

// Whether this species could show the numbers read: some IV spread and level gives that CP and HP.
function fits(species: Species, reading: Reading): boolean {
  const mods = { variant: reading.variant ?? 'normal', lucky: reading.lucky ?? false };
  const matches = inferSpreads({ base: species.base, cp: reading.cp!, hp: reading.hp, dust: reading.dust, mods });
  return matches.some((m) => !reading.ivs || sameIvs(m.ivs, reading.ivs));
}

const letters = (text: string) => text.toUpperCase().replace(/[^A-Z]/g, '');
const only = <T>(found: T[]) => (found.length === 1 ? found[0] : undefined);

// OCR misreads names on the dimmed appraisal, so a name one letter in four off still counts.
function nearName(index: SpeciesIndex, name: string): Species | undefined {
  return findSpecies(index, name) ?? only(index.all.filter((s) => isNear(letters(name), letters(s.name))));
}

// The family label as printed, misread by a letter, or a part (4+ letters) only one family has.
function nearFamily(index: SpeciesIndex, label: string): string | undefined {
  const families = [...new Set(index.all.map((s) => s.family))];
  const exact = families.find((f) => f === `FAMILY_${label}`);
  const name = (f: string) => letters(f.replace(/^FAMILY_/, ''));
  return exact ?? only(families.filter((f) => isNear(label, name(f)) || (label.length >= 4 && name(f).includes(label))));
}

// Members of the Candy family, narrowed by the numbers when they decide anything.
// IVs or Lucky that fit no member may come from another Pokémon's appraisal: the screen's numbers then decide.
function familyMembers(index: SpeciesIndex, reading: Reading): Species[] {
  const family = nearFamily(index, reading.family!);
  const members = index.all.filter((s) => s.family === family);
  if (reading.cp === undefined) return members;
  const fitting = members.filter((s) => fits(s, reading));
  const screenOnly = { ...reading, ivs: undefined, lucky: undefined };
  const loose = fitting.length ? fitting : members.filter((s) => fits(s, screenOnly));
  return loose.length ? loose : members;
}

/** The species a screenshot shows: one when it is certain, several to choose from, or none. */
export function resolveSpecies(index: SpeciesIndex, reading: Reading): Species[] {
  const named = reading.name ? nearName(index, reading.name) : undefined;
  if (named) return [named];
  return reading.family ? familyMembers(index, reading) : [];
}

/** The Candy family a reading shows, when its species can be told; used to group screenshots. */
export function readingFamily(index: SpeciesIndex, reading: Reading): string | undefined {
  return resolveSpecies(index, reading)[0]?.family;
}

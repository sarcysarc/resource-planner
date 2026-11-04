import { inferSpreads } from '../core/infer';
import type { Reading } from '../core/screen/types';
import { findSpecies, type Species, type SpeciesIndex } from './species';

const sameIvs = (a: Reading['ivs'], b: Reading['ivs']) => a!.atk === b!.atk && a!.def === b!.def && a!.hp === b!.hp;

// Whether this species could show the numbers read: some IV spread and level gives that CP and HP.
function fits(species: Species, reading: Reading): boolean {
  const mods = { variant: reading.variant ?? 'normal', lucky: reading.lucky ?? false };
  const matches = inferSpreads({ base: species.base, cp: reading.cp!, hp: reading.hp, dust: reading.dust, mods });
  return matches.some((m) => !reading.ivs || sameIvs(m.ivs, reading.ivs));
}

// Members of the Candy family, narrowed by the numbers when they decide anything.
function familyMembers(index: SpeciesIndex, reading: Reading): Species[] {
  const members = index.all.filter((s) => s.family === `FAMILY_${reading.family}`);
  if (reading.cp === undefined) return members;
  const fitting = members.filter((s) => fits(s, reading));
  return fitting.length ? fitting : members;
}

/** The species a screenshot shows: one when it is certain, several to choose from, or none. */
export function resolveSpecies(index: SpeciesIndex, reading: Reading): Species[] {
  const named = reading.name ? findSpecies(index, reading.name) : undefined;
  if (named) return [named];
  return reading.family ? familyMembers(index, reading) : [];
}

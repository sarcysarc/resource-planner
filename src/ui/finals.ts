// A line's target is its final evolution (ADR 0017). A line that branches (Oddish into
// Vileplume or Bellossom) has several, so step 1 asks which.
import type { Reading } from '../core/screen/types';
import { resolveSpecies } from './scanSpecies';
import { evolutionLine, findSpecies, type Species, type SpeciesIndex } from './species';

const childrenOf = (index: SpeciesIndex, species: Species) => index.all.filter((s) => s.parent === species.id);
const unique = (list: Species[]) => [...new Set(list)];

/** The last stages this species can evolve into; itself when it evolves no further. */
export function finalsOf(index: SpeciesIndex, species: Species): Species[] {
  const children = childrenOf(index, species);
  return children.length ? unique(children.flatMap((c) => finalsOf(index, c))) : [species];
}

/** The finals every species read can reach, or with none in common, any of theirs. */
export function lineFinals(index: SpeciesIndex, read: readonly Species[]): Species[] {
  const each = read.map((s) => finalsOf(index, s));
  const shared = unique(each.flat()).filter((f) => each.every((finals) => finals.includes(f)));
  return shared.length ? shared : unique(each.flat());
}

/** The target to set from a species read: its one final, or itself when its line branches. */
export function defaultTarget(index: SpeciesIndex, species: Species): string {
  const finals = finalsOf(index, species);
  return finals.length === 1 ? finals[0].name : species.name;
}

/** The finals to ask about for a line, or none when it doesn't branch or its target fits. */
export function targetChoices(index: SpeciesIndex, read: readonly Species[], target: string): string[] {
  const set = findSpecies(index, target);
  if (!read.length || (set && read.every((s) => evolutionLine(index, set).includes(s)))) return [];
  const finals = lineFinals(index, read);
  return finals.length > 1 ? finals.map((s) => s.name) : [];
}

/** The finals to ask about for each line, from the Pokémon read and the target it has. */
export function targetsOf(index: SpeciesIndex, targetOf: (family: string) => string): (family: string, readings: Reading[]) => string[] {
  return (family, readings) => {
    const read = readings.map((r) => resolveSpecies(index, r)).filter((found) => found.length === 1);
    return targetChoices(index, read.map(([s]) => s), targetOf(family));
  };
}

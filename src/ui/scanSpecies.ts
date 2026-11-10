import { isNear } from '../core/screen/fuzzy';
import type { Reading } from '../core/screen/types';
import { findSpecies, type Species, type SpeciesIndex } from './species';
import { fittingOnly, narrowByNumbers } from './speciesFit';

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

const baseName = (s: Species) => s.name.replace(/\s*\(.*\)$/, '');

// The game shows some Pokémon by a name the data only has as forms: "Giratina" is
// Giratina (Altered) or (Origin). Misread by a letter in four still counts.
function formsNamed(index: SpeciesIndex, name: string): Species[] {
  return index.all.filter((s) => s.name !== baseName(s) && isNear(letters(name), letters(baseName(s))));
}

// Members of the Candy family, or the forms its label names, narrowed by the numbers.
function familyMembers(index: SpeciesIndex, reading: Reading): Species[] {
  const family = nearFamily(index, reading.family!);
  const members = family ? index.all.filter((s) => s.family === family) : formsNamed(index, reading.family!);
  return narrowByNumbers(members, reading);
}

const sameStats = ({ base: a }: Species, { base: b }: Species) => a.atk === b.atk && a.def === b.def && a.hp === b.hp;

// The game shows some forms by the species' own name: "Mewtwo" for Armored Mewtwo, "Meowth"
// for Alolan Meowth (issue #4). With a CP read, the numbers decide; when several fit, step 1
// asks. A form with the species' stats can't be told by numbers, so the species stands for it.
function withForms(index: SpeciesIndex, named: Species, reading: Reading): Species[] {
  if (reading.cp === undefined) return [named];
  const forms = index.all.filter((s) => s !== named && baseName(s) === named.name && !sameStats(s, named));
  const fitting = forms.length ? fittingOnly([named, ...forms], reading) : [];
  return fitting.length ? fitting : [named];
}

/** The species a screenshot shows: one when it is certain, several to choose from, or none. */
export function resolveSpecies(index: SpeciesIndex, reading: Reading): Species[] {
  const named = reading.name ? nearName(index, reading.name) : undefined;
  if (named) return withForms(index, named, reading);
  const forms = reading.name ? formsNamed(index, reading.name) : [];
  if (forms.length) return narrowByNumbers(forms, reading);
  return reading.family ? familyMembers(index, reading) : [];
}

/** The Candy family a reading shows, when its species can be told; used to group screenshots. */
export function readingFamily(index: SpeciesIndex, reading: Reading): string | undefined {
  return resolveSpecies(index, reading)[0]?.family;
}

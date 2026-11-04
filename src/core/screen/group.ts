// Sorts screenshots into Pokémon (ADR 0015): by CP and HP, then by family.
import { type FamilyOf, type Group, mergeReadings } from './merge';
import type { Reading } from './types';

const hasNumbers = (r: Reading) => r.cp !== undefined || r.hp !== undefined;
const agrees = (a?: number, b?: number) => a === undefined || b === undefined || a === b;

// Same Pokémon: CP and HP agree, at least one of them is on both, and the families don't clash.
function samePokemon(a: Reading, b: Reading, familyOf: FamilyOf): boolean {
  const shared = (a.cp !== undefined && b.cp !== undefined) || (a.hp !== undefined && b.hp !== undefined);
  return shared && agrees(a.cp, b.cp) && agrees(a.hp, b.hp) && sameFamily(familyOf(a), familyOf(b));
}

const sameFamily = (a?: string, b?: string) => a === undefined || b === undefined || a === b;

interface Sorting {
  familyOf: FamilyOf;
  /** Every useful screenshot, oldest first. */
  order: Reading[];
}

// Of several Pokémon, the one screenshotted just before this one, else just after:
// players screenshot a Pokémon, scroll, screenshot again, then move on.
function nearest(groups: Reading[][], reading: Reading, order: Reading[]): Reading[] {
  const at = order.indexOf(reading);
  const gap = (g: Reading[]) => Math.min(...g.map((r) => order.indexOf(r) - at).map((d) => (d < 0 ? -d : d + order.length)));
  return [...groups].sort((a, b) => gap(a) - gap(b))[0];
}

// An appraisal shows the top of the screen, so one without CP or HP was misread and time
// order says nothing. It joins only the one Pokémon of its own family still without IVs.
function appraisalOwner(groups: Reading[][], reading: Reading, familyOf: FamilyOf): Reading[] | undefined {
  const family = familyOf(reading);
  const ours = (g: Reading[]) => g.some((r) => familyOf(r) === family) && g.every((r) => !r.ivs && sameFamily(familyOf(r), family));
  const open = family === undefined ? [] : groups.filter(ours);
  return open.length === 1 ? open[0] : undefined;
}

// A screenshot without CP or HP (scrolled down) joins a Pokémon of its family: the only
// one, else the one with the same power-up cost, else the nearest in time.
function owner(groups: Reading[][], reading: Reading, s: Sorting): Reading[] | undefined {
  if (reading.ivs) return appraisalOwner(groups, reading, s.familyOf);
  const family = s.familyOf(reading);
  const fits = groups.filter((g) => g.some(hasNumbers) && g.every((r) => sameFamily(s.familyOf(r), family)));
  const sameCost = fits.filter((g) => reading.dust !== undefined && g.some((r) => r.dust === reading.dust));
  const choices = sameCost.length ? sameCost : fits;
  if (choices.length) return nearest(choices, reading, s.order);
  return groups.find((g) => !g.some(hasNumbers) && g.some((r) => s.familyOf(r) === family));
}

// A family label OCR cut or misread ("RLAX") takes the family's full name, so it can't clash.
function fullFamily(reading: Reading, familyOf: FamilyOf): Reading {
  const family = reading.family && familyOf(reading);
  return family ? { ...reading, family: family.replace(/^FAMILY_/, '') } : reading;
}

/** Sorts screenshots, oldest first, into Pokémon. Screenshots that gave nothing are skipped. */
export function groupReadings(readings: Reading[], familyOf: FamilyOf): Group[] {
  const groups: Reading[][] = [];
  const order = readings.filter((r) => Object.keys(r).length);
  const join = (r: Reading, group?: Reading[]) => (group ? group.push(r) : groups.push([r]));
  for (const r of order.filter(hasNumbers)) join(r, groups.find((g) => g.every((s) => samePokemon(s, r, familyOf))));
  for (const r of order.filter((s) => !hasNumbers(s))) join(r, owner(groups, r, { familyOf, order }));
  const inOrder = (group: Reading[]) => [...group].sort((x, y) => order.indexOf(x) - order.indexOf(y));
  return groups.map((group) => mergeReadings(inOrder(group).map((r) => fullFamily(r, familyOf))));
}

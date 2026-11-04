import type { Reading, Totals } from './types';

type Field = Exclude<keyof Reading, 'totals'>;

/** A value two screenshots of the same Pokémon disagree on. The player picks. */
export interface Conflict {
  field: Field;
  values: unknown[];
}

/** One Pokémon, merged from `shots` screenshots. */
export interface Group {
  reading: Reading;
  conflicts: Conflict[];
  shots: number;
}

/** The Candy family a reading belongs to, when it can be told. */
export type FamilyOf = (reading: Reading) => string | undefined;

const key = (value: unknown) => JSON.stringify(value);

function distinct(readings: Reading[], field: Field): unknown[] {
  const values = readings.map((r) => r[field]).filter((v) => v !== undefined);
  return values.filter((v, i) => values.findIndex((w) => key(w) === key(v)) === i);
}

// The appraisal footer gives the real species; the Pokémon screen may show a nickname.
// A name nobody can settle is dropped quietly: the Candy family still says what it is.
function settleName(readings: Reading[]): string | undefined {
  const names = distinct(readings, 'name') as string[];
  if (names.length < 2) return names[0];
  return readings.find((r) => r.ivs && r.name)?.name;
}

/** Combines screenshots of one Pokémon, oldest first. Totals change over time, so the newest wins. */
export function mergeReadings(readings: Reading[]): Group {
  const reading: Reading = {};
  const conflicts: Conflict[] = [];
  const fields = new Set(readings.flatMap((r) => Object.keys(r) as (keyof Reading)[]));
  for (const field of fields) {
    if (field === 'totals' || field === 'name') continue;
    const values = distinct(readings, field);
    if (values.length === 1) Object.assign(reading, { [field]: values[0] });
    else conflicts.push({ field, values });
  }
  const name = settleName(readings);
  if (name !== undefined) reading.name = name;
  const totals: Totals = Object.assign({}, ...readings.map((r) => r.totals ?? {}));
  if (Object.keys(totals).length) reading.totals = totals;
  return { reading, conflicts, shots: readings.length };
}

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

// A screenshot without CP or HP (scrolled down) joins a Pokémon of its family: the only
// one, else the one with the same power-up cost, else the nearest in time.
function owner(groups: Reading[][], reading: Reading, s: Sorting): Reading[] | undefined {
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

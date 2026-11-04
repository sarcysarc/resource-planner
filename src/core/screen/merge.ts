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

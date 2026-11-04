// Compares what the site read from one screenshot with the answer key (ADR 0016).
import type { Reading } from '../src/core/screen/types';
import type { Shot } from './truth';

/** One field that came out wrong. `got` is undefined when nothing was read. */
export interface Miss {
  shot: string;
  field: string;
  want: unknown;
  got: unknown;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const ivList = (r: Reading) => (r.ivs ? [r.ivs.atk, r.ivs.def, r.ivs.hp] : undefined);

// A screen that is not about one Pokémon must give no Pokémon values at all.
function strays(shot: string, reading: Reading): Miss[] {
  const found = (['cp', 'hp', 'ivs', 'name'] as const).filter((f) => reading[f] !== undefined);
  return found.map((field) => ({ shot, field, want: undefined, got: reading[field] }));
}

// The values the answer key gives for this screen, as the reading names them.
function wanted(want: Shot): [string, unknown, (r: Reading) => unknown][] {
  const fields: [string, unknown, (r: Reading) => unknown][] = [
    ['cp', want.cp === null ? undefined : want.cp, (r) => r.cp],
    ['hp', want.hp, (r) => r.hp],
    ['name', want.name, (r) => r.name],
    ['ivs', want.ivs, ivList],
    ['variant', want.variant, (r) => r.variant ?? 'normal'],
    ['lucky', want.lucky, (r) => r.lucky ?? false],
    ['family', want.family, (r) => r.family],
  ];
  return fields.filter(([field, value]) => value !== undefined || (field === 'cp' && want.cp === null));
}

/** The fields of one screenshot's reading that disagree with the answer key. */
export function compareShot(shot: string, want: Shot, reading: Reading): Miss[] {
  if (want.screen === 'other') return strays(shot, reading);
  return wanted(want)
    .map(([field, value, read]) => ({ shot, field, want: value, got: read(reading) }))
    .filter((m) => !same(m.want, m.got));
}

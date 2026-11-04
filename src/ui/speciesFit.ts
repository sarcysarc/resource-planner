// Whether a species could show the numbers read from a screenshot; used to tell family
// members and forms apart.
import { inferSpreads } from '../core/infer';
import type { Reading } from '../core/screen/types';
import type { Species } from './species';

const sameIvs = (a: Reading['ivs'], b: Reading['ivs']) => a!.atk === b!.atk && a!.def === b!.def && a!.hp === b!.hp;

// Some IV spread and level gives that CP and HP (and the IVs, when read).
function fits(species: Species, reading: Reading): boolean {
  const mods = { variant: reading.variant ?? 'normal', lucky: reading.lucky ?? false };
  const matches = inferSpreads({ base: species.base, cp: reading.cp!, hp: reading.hp, dust: reading.dust, mods });
  return matches.some((m) => !reading.ivs || sameIvs(m.ivs, reading.ivs));
}

/**
 * The candidates whose stats fit the numbers, when the numbers decide anything; else all.
 * IVs or Lucky that fit none may come from another Pokémon's appraisal: the screen's numbers then decide.
 */
export function narrowByNumbers(candidates: Species[], reading: Reading): Species[] {
  if (reading.cp === undefined) return candidates;
  const fitting = candidates.filter((s) => fits(s, reading));
  const screenOnly = { ...reading, ivs: undefined, lucky: undefined };
  const loose = fitting.length ? fitting : candidates.filter((s) => fits(s, screenOnly));
  return loose.length ? loose : candidates;
}

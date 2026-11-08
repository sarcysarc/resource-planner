// The bundled Candy to evolve table (ADR 0019), from PokeMiners, credited in the app.
import bundled from '../data/evolve.json';
import { EvolveFileSchema } from '../data/evolve';

/** Species id to the undiscounted Candy for evolving into it from its parent. */
export type KnownCosts = ReadonlyMap<string, number>;

export function loadBundledEvolve(): KnownCosts {
  return new Map(Object.entries(EvolveFileSchema.parse(bundled).costs));
}

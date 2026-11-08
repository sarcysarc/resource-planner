// The bundled purify cost per species (ADR 0005, amended 2026-11-08), from PokeMiners,
// credited in the app. Parsed once, the first time Compare needs it.
import bundled from '../data/purify.json';
import { type PurifyCost, PurifyFileSchema } from '../data/purify';

let costs: ReadonlyMap<string, PurifyCost> | undefined;

/** What purifying a Shadow of this species costs, or null when it has no price. */
export function purifyCostOf(speciesId: string): PurifyCost | null {
  costs ??= new Map(Object.entries(PurifyFileSchema.parse(bundled).costs));
  return costs.get(speciesId) ?? null;
}

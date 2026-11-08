// Purify cost per species (ADR 0005, amended 2026-11-08): the Stardust and Candy to
// purify a Shadow, from PokeMiners' game master, credited in the app. It replaces a
// table guessed from the second-move cost, which priced 97 species wrongly. Shared by
// the build script and the app; imports only packages, so Node can run it directly.
import { z } from 'zod';
import { type GameSpecies, plainTemplate, readTemplates, templateOf } from './gameMaster.ts';

export const PURIFY_SCHEMA_VERSION = 1;

const Cost = z.object({ stardust: z.number().int().nonnegative(), candy: z.number().int().nonnegative() });

export const PurifyFileSchema = z.object({
  schemaVersion: z.literal(PURIFY_SCHEMA_VERSION),
  source: z.string(),
  /** Species id to what purifying a Shadow of it costs. */
  costs: z.record(z.string(), Cost),
});

export type PurifyFile = z.infer<typeof PurifyFileSchema>;
export type PurifyCost = z.infer<typeof Cost>;

/** Builds purify.json from our species and PokeMiners' game master. */
export function toPurifyFile(input: { species: readonly GameSpecies[]; pve: unknown; source: string }): PurifyFile {
  const t = readTemplates(input.pve);
  const costs: Record<string, PurifyCost> = {};
  for (const s of input.species) {
    const shadow = templateOf(t, s)?.shadow ?? plainTemplate(t, s)?.shadow;
    if (shadow) costs[s.id] = { stardust: shadow.purificationStardustNeeded, candy: shadow.purificationCandyNeeded };
  }
  return { schemaVersion: PURIFY_SCHEMA_VERSION, source: input.source, costs };
}

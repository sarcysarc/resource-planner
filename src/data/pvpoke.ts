// Species data built from PvPoke's game master (MIT), ADR 0005. Shared by the build
// script (scripts/build-species.ts) and the app, so both check the same schema.
// Imports only packages, so Node can run it directly with type stripping.
import { z } from 'zod';

export const SCHEMA_VERSION = 2;

const StatsSchema = z.object({ atk: z.number(), def: z.number(), hp: z.number() });

export const SpeciesSchema = z.object({
  id: z.string(),
  name: z.string(),
  dex: z.number(),
  base: StatsSchema,
  types: z.array(z.string()).min(1),
  family: z.string(),
  parent: z.string().nullable(),
  secondMoveDust: z.number().nullable(),
});

export const SpeciesFileSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  source: z.string(),
  timestamp: z.string(),
  species: z.array(SpeciesSchema),
});

export type Species = z.infer<typeof SpeciesSchema>;
export type SpeciesFile = z.infer<typeof SpeciesFileSchema>;

// Only the parts of PvPoke's file we read; anything else is ignored.
const PvpokeEntry = z.object({
  dex: z.number(),
  speciesId: z.string(),
  speciesName: z.string(),
  baseStats: StatsSchema,
  types: z.array(z.string()),
  // false in the source means the species cannot unlock a second charged move
  thirdMoveCost: z.union([z.number(), z.literal(false)]).optional(),
  released: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  family: z.object({ id: z.string(), parent: z.string().optional() }).optional(),
});

const PvpokeGameMaster = z.object({ timestamp: z.string(), pokemon: z.array(z.unknown()) });

type PvpokeEntry = z.infer<typeof PvpokeEntry>;

function isUsable(p: PvpokeEntry): boolean {
  const tags = p.tags ?? [];
  return p.released !== false && !tags.includes('shadow') && !tags.includes('mega');
}

function slim(p: PvpokeEntry): Species {
  return {
    id: p.speciesId,
    name: p.speciesName,
    dex: p.dex,
    base: p.baseStats,
    types: p.types.filter((t) => t !== 'none'),
    family: p.family?.id ?? p.speciesId,
    parent: p.family?.parent ?? null,
    secondMoveDust: typeof p.thirdMoveCost === 'number' ? p.thirdMoveCost : null,
  };
}

/** Turns PvPoke's game master into the app's species file, checked on the way out. */
export function toSpeciesFile(gameMaster: unknown, source: string): SpeciesFile {
  const gm = PvpokeGameMaster.parse(gameMaster);
  const species = gm.pokemon.map((p) => PvpokeEntry.parse(p)).filter(isUsable).map(slim);
  return SpeciesFileSchema.parse({ schemaVersion: SCHEMA_VERSION, source, timestamp: gm.timestamp, species });
}

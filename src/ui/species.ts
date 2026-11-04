import { z } from 'zod';
import bundled from '../data/species.json';

const SpeciesSchema = z.object({
  id: z.string(),
  name: z.string(),
  dex: z.number(),
  base: z.object({ atk: z.number(), def: z.number(), hp: z.number() }),
  family: z.string(),
  parent: z.string().nullable(),
  secondMoveDust: z.number().nullable(),
});

const SpeciesFileSchema = z.object({
  timestamp: z.string(),
  species: z.array(SpeciesSchema),
});

export type Species = z.infer<typeof SpeciesSchema>;

export interface SpeciesIndex {
  all: Species[];
  timestamp: string;
  lookup: Map<string, Species>;
}

export function buildIndex(data: unknown): SpeciesIndex {
  const file = SpeciesFileSchema.parse(data);
  const lookup = new Map<string, Species>();
  for (const s of file.species) {
    lookup.set(s.id, s);
    if (!lookup.has(s.name.toLowerCase())) lookup.set(s.name.toLowerCase(), s);
  }
  return { all: file.species, timestamp: file.timestamp, lookup };
}

export function loadBundledIndex(): SpeciesIndex {
  return buildIndex(bundled);
}

export function findSpecies(index: SpeciesIndex, nameOrId: string): Species | undefined {
  return index.lookup.get(nameOrId.trim().toLowerCase());
}

/** First stage → … → target. Earlier stages share Candy and keep IVs when evolved. */
export function evolutionLine(index: SpeciesIndex, target: Species): Species[] {
  const line = [target];
  let parent = target.parent ? index.lookup.get(target.parent) : undefined;
  while (parent && !line.includes(parent)) {
    line.unshift(parent);
    parent = parent.parent ? index.lookup.get(parent.parent) : undefined;
  }
  return line;
}

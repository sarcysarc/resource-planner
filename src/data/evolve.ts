// Candy to evolve (ADR 0019): the cost of evolving into each species, from PokeMiners'
// game master, credited in the app. Shared by the build script and the app. Imports only
// packages, so Node can run it directly.
import { z } from 'zod';
import { type Branch, formKey, type GameSpecies, readTemplates, templateOf, type Templates } from './gameMaster.ts';

export const EVOLVE_SCHEMA_VERSION = 1;

export const EvolveFileSchema = z.object({
  schemaVersion: z.literal(EVOLVE_SCHEMA_VERSION),
  source: z.string(),
  /** Species id to the undiscounted Candy for evolving into it from its parent. */
  costs: z.record(z.string(), z.number().int().positive()),
});

export type EvolveFile = z.infer<typeof EvolveFileSchema>;
/** The fields of a species this needs. */
export type EvolveSpecies = GameSpecies;

// One cost, or the one whose form matches the species when the branches disagree.
function pickCost(branches: Branch[], child: GameSpecies): number | undefined {
  const costs = new Set(branches.map((b) => b.candyCost));
  if (costs.size === 1) return [...costs][0];
  const forms = [formKey(child.id), `${formKey(child.id)}_NORMAL`];
  return branches.find((b) => b.form && forms.includes(b.form))?.candyCost;
}

// The parent's own template's branches into the child, else those of any of its forms
// (Deerling's plain template has none; each season's does).
function costOf(t: Templates, child: GameSpecies, parent: GameSpecies): number | undefined {
  const name = t.names.get(child.dex);
  const into = (branches: Branch[] = []) => branches.filter((b) => b.evolution === name && b.candyCost);
  const own = into(templateOf(t, parent)?.evolutionBranch);
  return pickCost(own.length ? own : into(t.allBranches.get(t.names.get(parent.dex) ?? '')), child);
}

/** Builds evolve.json from our species and PokeMiners' game master. */
export function toEvolveFile(input: { species: readonly GameSpecies[]; pve: unknown; source: string }): EvolveFile {
  const t = readTemplates(input.pve);
  const byId = new Map(input.species.map((s) => [s.id, s]));
  const costs: Record<string, number> = {};
  for (const child of input.species) {
    const parent = child.parent ? byId.get(child.parent) : undefined;
    const cost = parent && costOf(t, child, parent);
    if (cost) costs[child.id] = cost;
  }
  return { schemaVersion: EVOLVE_SCHEMA_VERSION, source: input.source, costs };
}

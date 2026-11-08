// Candy to evolve (ADR 0019): the cost of evolving into each species, from PokeMiners'
// game master, credited in the app. Shared by the build script and the app. Imports only
// packages, so Node can run it directly.
import { z } from 'zod';

export const EVOLVE_SCHEMA_VERSION = 1;

export const EvolveFileSchema = z.object({
  schemaVersion: z.literal(EVOLVE_SCHEMA_VERSION),
  source: z.string(),
  /** Species id to the undiscounted Candy for evolving into it from its parent. */
  costs: z.record(z.string(), z.number().int().positive()),
});

export type EvolveFile = z.infer<typeof EvolveFileSchema>;

const Branch = z.object({ evolution: z.string().optional(), form: z.string().optional(), candyCost: z.number().optional() });
const Template = z.object({
  templateId: z.string(),
  data: z.object({
    pokemonSettings: z.object({
      pokemonId: z.string(),
      form: z.string().optional(),
      evolutionBranch: z.array(Branch).optional(),
    }).optional(),
  }),
});

type Settings = NonNullable<z.infer<typeof Template>['data']['pokemonSettings']>;
type Branch = z.infer<typeof Branch>;

/** The fields of a species this needs. */
export interface EvolveSpecies {
  id: string;
  dex: number;
  parent: string | null;
}

interface Templates {
  /** Each Pokédex number's PokeMiners name, as in RAICHU. */
  names: Map<number, string>;
  /** Each template by its form, or by its name for the plain one. */
  byForm: Map<string, Settings>;
  /** Every branch of every form of each name, for when the parent's own has none. */
  allBranches: Map<string, Branch[]>;
}

const dexOf = (templateId: string) => Number(templateId.slice(1, 5));
// PvPoke's raichu_alolan is PokeMiners' RAICHU_ALOLA.
const formKey = (id: string) => id.toUpperCase().replace(/_ALOLAN$/, '_ALOLA').replace(/_PALDEAN$/, '_PALDEA');

function readTemplates(entries: unknown): Templates {
  const names = new Map<number, string>();
  const byForm = new Map<string, Settings>();
  const allBranches = new Map<string, Branch[]>();
  for (const { templateId, data } of z.array(Template).parse(entries)) {
    const s = data.pokemonSettings;
    if (!s) continue;
    if (!names.has(dexOf(templateId))) names.set(dexOf(templateId), s.pokemonId);
    const key = s.form ?? s.pokemonId;
    if (!byForm.has(key) || !s.form) byForm.set(key, s);
    allBranches.set(s.pokemonId, [...(allBranches.get(s.pokemonId) ?? []), ...(s.evolutionBranch ?? [])]);
  }
  return { names, byForm, allBranches };
}

// The parent's own form's template, else the plain one (or its _NORMAL form).
function parentTemplate(t: Templates, parent: EvolveSpecies): Settings | undefined {
  const name = t.names.get(parent.dex);
  if (!name) return undefined;
  return t.byForm.get(formKey(parent.id)) ?? t.byForm.get(name) ?? t.byForm.get(`${name}_NORMAL`);
}

// One cost, or the one whose form matches the species when the branches disagree.
function pickCost(branches: Branch[], child: EvolveSpecies): number | undefined {
  const costs = new Set(branches.map((b) => b.candyCost));
  if (costs.size === 1) return [...costs][0];
  const forms = [formKey(child.id), `${formKey(child.id)}_NORMAL`];
  return branches.find((b) => b.form && forms.includes(b.form))?.candyCost;
}

// The parent's own template's branches into the child, else those of any of its forms
// (Deerling's plain template has none; each season's does).
function costOf(t: Templates, child: EvolveSpecies, parent: EvolveSpecies): number | undefined {
  const name = t.names.get(child.dex);
  const into = (branches: Branch[] = []) => branches.filter((b) => b.evolution === name && b.candyCost);
  const own = into(parentTemplate(t, parent)?.evolutionBranch);
  return pickCost(own.length ? own : into(t.allBranches.get(t.names.get(parent.dex) ?? '')), child);
}

/** Builds evolve.json from our species and PokeMiners' game master. */
export function toEvolveFile(input: { species: readonly EvolveSpecies[]; pve: unknown; source: string }): EvolveFile {
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

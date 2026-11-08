// Reads the parts of PokeMiners' game master the build uses (ADR 0005 amendment, 0019),
// and finds each PvPoke species' template. Imports only packages, so Node can run it.
import { z } from 'zod';

const Branch = z.object({ evolution: z.string().optional(), form: z.string().optional(), candyCost: z.number().optional() });
const Shadow = z.object({ purificationStardustNeeded: z.number(), purificationCandyNeeded: z.number() });
const Settings = z.object({
  pokemonId: z.string(),
  form: z.string().optional(),
  evolutionBranch: z.array(Branch).optional(),
  shadow: Shadow.optional(),
});
const Template = z.object({ templateId: z.string(), data: z.object({ pokemonSettings: Settings.optional() }) });

export type Settings = z.infer<typeof Settings>;
export type Branch = z.infer<typeof Branch>;

/** The fields of a PvPoke species the build matches on. */
export interface GameSpecies {
  id: string;
  dex: number;
  parent: string | null;
}

export interface Templates {
  /** Each Pokédex number's PokeMiners name, as in RAICHU. */
  names: Map<number, string>;
  /** Each template by its form, or by its name for the plain one. */
  byForm: Map<string, Settings>;
  /** Every branch of every form of each name, for when a species' own has none. */
  allBranches: Map<string, Branch[]>;
}

const dexOf = (templateId: string) => Number(templateId.slice(1, 5));
// PvPoke's raichu_alolan is PokeMiners' RAICHU_ALOLA.
export const formKey = (id: string) => id.toUpperCase().replace(/_ALOLAN$/, '_ALOLA').replace(/_PALDEAN$/, '_PALDEA');

export function readTemplates(entries: unknown): Templates {
  const t: Templates = { names: new Map(), byForm: new Map(), allBranches: new Map() };
  for (const { templateId, data } of z.array(Template).parse(entries)) {
    const s = data.pokemonSettings;
    if (!s) continue;
    if (!t.names.has(dexOf(templateId))) t.names.set(dexOf(templateId), s.pokemonId);
    const key = s.form ?? s.pokemonId;
    if (!t.byForm.has(key) || !s.form) t.byForm.set(key, s);
    t.allBranches.set(s.pokemonId, [...(t.allBranches.get(s.pokemonId) ?? []), ...(s.evolutionBranch ?? [])]);
  }
  return t;
}

/** The species' plain template (or its _NORMAL form's). */
export function plainTemplate(t: Templates, species: GameSpecies): Settings | undefined {
  const name = t.names.get(species.dex);
  return name === undefined ? undefined : t.byForm.get(name) ?? t.byForm.get(`${name}_NORMAL`);
}

/** The species' own form's template, else the plain one. */
export function templateOf(t: Templates, species: GameSpecies): Settings | undefined {
  if (!t.names.has(species.dex)) return undefined;
  return t.byForm.get(formKey(species.id)) ?? plainTemplate(t, species);
}

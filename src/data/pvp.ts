// PvP meta opponents and recommended fast moves per league, from PvPoke's rankings
// and game master (MIT), ADR 0012. Shared by the build script and the app.
// Imports only packages, so Node can run it directly with type stripping.
import { z } from 'zod';

export const PVP_SCHEMA_VERSION = 1;
export const TOP_OPPONENTS = 30;

export const LEAGUES = ['great', 'ultra', 'master'] as const;
export type LeagueId = (typeof LEAGUES)[number];

/** PvPoke's ranking file name per league: its CP cap. */
export const LEAGUE_FILES: Record<LeagueId, string> = { great: '1500', ultra: '2500', master: '10000' };

const OpponentSchema = z.object({
  id: z.string(),
  variant: z.enum(['normal', 'shadow']),
  fast: z.string(),
  level: z.number(),
  ivs: z.object({ atk: z.number(), def: z.number(), hp: z.number() }),
});

const LeagueSchema = z.object({
  opponents: z.array(OpponentSchema),
  /** Recommended fast move by PvPoke species id (a Shadow ends in `_shadow`). */
  picks: z.record(z.string(), z.string()),
});

export const PvpFileSchema = z.object({
  schemaVersion: z.literal(PVP_SCHEMA_VERSION),
  sources: z.object({ gamemaster: z.string(), rankings: z.string() }),
  timestamp: z.string(),
  leagues: z.object({ great: LeagueSchema, ultra: LeagueSchema, master: LeagueSchema }),
});

export type Opponent = z.infer<typeof OpponentSchema>;
export type League = z.infer<typeof LeagueSchema>;
export type PvpFile = z.infer<typeof PvpFileSchema>;

const Tuple = z.tuple([z.number(), z.number(), z.number(), z.number()]);
const GmEntry = z.object({ speciesId: z.string(), defaultIVs: z.record(z.string(), Tuple).optional() });
const GameMaster = z.object({ timestamp: z.string(), pokemon: z.array(z.unknown()) });
const Ranking = z.array(z.object({ speciesId: z.string(), moveset: z.array(z.string()).min(1) }));

type Tuple = z.infer<typeof Tuple>;
type DefaultIVs = Map<string, Record<string, Tuple>>;

// PvPoke's Master League default; its game master lists none for that league.
const MASTER_DEFAULT: Tuple = [50, 15, 15, 15];

function defaultsFor(defaults: DefaultIVs, league: LeagueId, speciesId: string): Tuple | undefined {
  return league === 'master' ? MASTER_DEFAULT : defaults.get(speciesId)?.[`cp${LEAGUE_FILES[league]}`];
}

function toLeague(defaults: DefaultIVs, league: LeagueId, ranking: unknown): League {
  const ranked = Ranking.parse(ranking);
  const opponents = ranked.flatMap(({ speciesId, moveset }) => {
    const iv = defaultsFor(defaults, league, speciesId);
    if (!iv) return [];
    const shadow = speciesId.endsWith('_shadow');
    const id = shadow ? speciesId.slice(0, -'_shadow'.length) : speciesId;
    return [{ id, variant: shadow ? 'shadow' : 'normal', fast: moveset[0], level: iv[0], ivs: { atk: iv[1], def: iv[2], hp: iv[3] } } as const];
  });
  const picks = Object.fromEntries(ranked.map((r) => [r.speciesId, r.moveset[0]]));
  return { opponents: opponents.slice(0, TOP_OPPONENTS), picks };
}

export interface PvpSources {
  gamemaster: unknown;
  rankings: Record<LeagueId, unknown>;
  sources: PvpFile['sources'];
}

/** Turns PvPoke's game master and league rankings into the app's PvP file. */
export function toPvpFile({ gamemaster, rankings, sources }: PvpSources): PvpFile {
  const gm = GameMaster.parse(gamemaster);
  const entries = gm.pokemon.map((p) => GmEntry.safeParse(p)).flatMap((r) => (r.success ? [r.data] : []));
  const defaults: DefaultIVs = new Map(entries.map((e) => [e.speciesId, e.defaultIVs ?? {}]));
  const leagues = Object.fromEntries(LEAGUES.map((l) => [l, toLeague(defaults, l, rankings[l])]));
  return PvpFileSchema.parse({ schemaVersion: PVP_SCHEMA_VERSION, sources, timestamp: gm.timestamp, leagues });
}

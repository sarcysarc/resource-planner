// Move stats (ADR 0007): PvP stats from PvPoke's game master (MIT); PvE power,
// duration and energy from PokeMiners' game master, credited in the app. Shared by
// the build script and the app. Imports only packages, so Node can run it directly.
import { z } from 'zod';

export const MOVES_SCHEMA_VERSION = 1;

const PvpStats = z.object({ power: z.number(), energy: z.number(), turns: z.number() });
const PveStats = z.object({ power: z.number(), durationMs: z.number(), energy: z.number() });

export const MoveSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  kind: z.enum(['fast', 'charged']),
  pvp: PvpStats,
  /** null when the PvE source has no entry for this move. */
  pve: PveStats.nullable(),
});

export const MovesFileSchema = z.object({
  schemaVersion: z.literal(MOVES_SCHEMA_VERSION),
  sources: z.object({ pvp: z.string(), pve: z.string() }),
  timestamp: z.string(),
  moves: z.array(MoveSchema),
});

export type Move = z.infer<typeof MoveSchema>;
export type MovesFile = z.infer<typeof MovesFileSchema>;
type PveStats = z.infer<typeof PveStats>;

const PvpokeMove = z.object({
  moveId: z.string(),
  name: z.string(),
  type: z.string(),
  power: z.number(),
  energy: z.number(),
  energyGain: z.number(),
  turns: z.number(),
});
const PvpokeMoves = z.object({ timestamp: z.string(), moves: z.array(PvpokeMove) });

const PokeMinersEntry = z.object({
  templateId: z.string(),
  data: z.object({
    moveSettings: z.object({
      power: z.number().default(0),
      durationMs: z.number(),
      energyDelta: z.number().default(0),
    }).optional(),
  }),
});

const TEMPLATE = /^V\d{4}_MOVE_(.+?)(?:_FAST)?$/;
// The PvE game has one Hidden Power; PvPoke lists one per type.
const HIDDEN_POWER = /^HIDDEN_POWER_.+$/;
// PvPoke ids the PvE source spells differently.
const PVE_NAMES: Record<string, string> = {
  FUTURE_SIGHT: 'FUTURESIGHT',
  PYRO_BALL: 'PYROBALL',
  TECHNO_BLAST_DOUSE: 'TECHNO_BLAST_WATER',
};
const pveKey = (id: string) => PVE_NAMES[id] ?? id.replace(HIDDEN_POWER, 'HIDDEN_POWER');

/** The move id inside a PokeMiners template id, or null for other templates. */
export function pveId(templateId: string): string | null {
  return TEMPLATE.exec(templateId)?.[1] ?? null;
}

function pveTable(entries: unknown): Map<string, PveStats> {
  const table = new Map<string, PveStats>();
  for (const entry of z.array(PokeMinersEntry).parse(entries)) {
    const id = pveId(entry.templateId);
    const s = entry.data.moveSettings;
    if (id && s) table.set(id, { power: s.power, durationMs: s.durationMs, energy: Math.abs(s.energyDelta) });
  }
  return table;
}

function toMove(m: z.infer<typeof PvpokeMove>, pve: Map<string, PveStats>): Move {
  const kind = m.energy === 0 ? 'fast' : 'charged';
  const energy = kind === 'fast' ? m.energyGain : m.energy;
  return {
    id: m.moveId, name: m.name, type: m.type, kind,
    pvp: { power: m.power, energy, turns: m.turns }, pve: pve.get(pveKey(m.moveId)) ?? null,
  };
}

export interface MovesInput {
  /** PvPoke's game master. */
  pvp: unknown;
  /** PokeMiners' game master: an array of templates. */
  pve: unknown;
  sources: { pvp: string; pve: string };
}

/** Joins both sources into the app's moves file, checked on the way out. */
export function toMovesFile({ pvp, pve, sources }: MovesInput): MovesFile {
  const gm = PvpokeMoves.parse(pvp);
  const table = pveTable(pve);
  const moves = gm.moves.map((m) => toMove(m, table));
  return MovesFileSchema.parse({ schemaVersion: MOVES_SCHEMA_VERSION, sources, timestamp: gm.timestamp, moves });
}

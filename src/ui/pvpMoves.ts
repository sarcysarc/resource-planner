// The fast move each candidate uses in PvP matchups (ADR 0012): PvPoke's pick per
// league, or the one the player picks.
import { STAB } from '../core/damage';
import type { NamedHit, PvpMoves } from '../core/matchups';
import type { Move } from '../data/moves';
import { type LeagueId, LEAGUES, type League, type PvpFile, PvpFileSchema } from '../data/pvp';
import type { MovesIndex } from './moves';
import type { Species } from './species';

/** Loads pvp.json as its own chunk, so the main bundle does not carry it. */
export async function loadPvp(): Promise<PvpFile> {
  return PvpFileSchema.parse((await import('../data/pvp.json')).default);
}

const picker = (root: ParentNode) => root.querySelector<HTMLSelectElement>('select[name="pvpFastMove"]');

const fastMoves = (target: Species, moves: MovesIndex) =>
  target.fast.flatMap((id) => moves.get(id) ?? []);

export interface PickerSource {
  root: ParentNode;
  target: Species;
  moves: MovesIndex;
}

/** Offers PvPoke's pick and every fast move of the target, keeping a pick still offered. */
export function fillPvpPicker({ root, target, moves }: PickerSource): void {
  const select = picker(root);
  if (!select) return;
  const kept = select.value;
  const options = fastMoves(target, moves);
  select.replaceChildren(new Option('PvPoke’s pick', ''), ...options.map((m) => new Option(m.name, m.id)));
  select.value = options.some((m) => m.id === kept) ? kept : '';
}

const named = (m: Move): NamedHit => ({ name: m.name, power: m.pvp.power, type: m.type });

// Damage per turn with STAB, for a species PvPoke does not rank.
function strongest(target: Species, moves: MovesIndex): Move | undefined {
  const rate = (m: Move) => (m.pvp.power * (target.types.includes(m.type) ? STAB : 1)) / Math.max(1, m.pvp.turns);
  return fastMoves(target, moves).reduce<Move | undefined>((best, m) => (!best || rate(m) > rate(best) ? m : best), undefined);
}

function leaguePick(league: League, target: Species, shadow: boolean): string | undefined {
  return (shadow ? league.picks[`${target.id}_shadow`] : undefined) ?? league.picks[target.id];
}

export interface PvpSource extends PickerSource {
  data: PvpFile;
}

/** The target's types and fast move per league, or undefined if it has no fast move. */
export function pvpMovesFor({ root, target, data, moves }: PvpSource): PvpMoves | undefined {
  const shadow = root.querySelector<HTMLSelectElement>('select[name="variant"]')?.value === 'shadow';
  const picked = moves.get(picker(root)?.value ?? '');
  const fallback = strongest(target, moves);
  const entries = LEAGUES.map((l) => [l, picked ?? moves.get(leaguePick(data.leagues[l], target, shadow) ?? '') ?? fallback] as const);
  if (entries.some(([, m]) => !m)) return undefined;
  const fast = Object.fromEntries(entries.map(([l, m]) => [l, named(m!)])) as Record<LeagueId, NamedHit>;
  return { types: target.types, fast };
}

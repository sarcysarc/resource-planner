// Each option's damage per fast move against the league's meta opponents, shown under
// its league result (ADR 0012). The verdict does not use it.
import type { Comparison } from '../core/compare';
import type { Candidate, GoalId, GoalResult } from '../core/goals';
import { type Fighter, matchup, type Matchup, tally, type Tally } from '../core/matchups';
import { battleStats } from '../core/stats';
import { type LeagueId, LEAGUES, type Opponent, type PvpFile } from '../data/pvp';
import type { MovesIndex } from './moves';
import { findSpecies, type SpeciesIndex } from './species';

export interface OpponentFighter {
  name: string;
  /** Its fast move's name. */
  fast: string;
  fighter: Fighter;
}

export type Opponents = Record<LeagueId, OpponentFighter[]>;

export interface OpponentSource {
  data: PvpFile;
  index: SpeciesIndex;
  moves: MovesIndex;
}

function toFighter({ index, moves }: OpponentSource, o: Opponent): OpponentFighter[] {
  const species = findSpecies(index, o.id);
  const move = moves.get(o.fast);
  if (!species || !move) return [];
  const stats = battleStats({ base: species.base, ivs: o.ivs, level: o.level });
  const fighter = { stats, types: species.types, variant: o.variant, fast: { power: move.pvp.power, type: move.type } };
  const name = o.variant === 'shadow' ? `Shadow ${species.name}` : species.name;
  return [{ name, fast: move.name, fighter }];
}

/** The opponents the species index and moves know, per league. */
export function opponentsFrom(source: OpponentSource): Opponents {
  const per = (l: LeagueId) => source.data.leagues[l].opponents.flatMap((o) => toFighter(source, o));
  return Object.fromEntries(LEAGUES.map((l) => [l, per(l)])) as Opponents;
}

interface Side {
  fast: string;
  matchups: Matchup[];
}

interface Field {
  league: LeagueId;
  opponents: OpponentFighter[];
}

function sideOf(c: Candidate, r: GoalResult, { league, opponents }: Field): Side | null {
  if (!c.pvpMoves || !r.eligible) return null;
  const fast = c.pvpMoves.fast[league];
  const stats = battleStats({ base: c.base, ivs: c.ivs, level: r.effectiveLevel });
  const me: Fighter = { stats, types: c.pvpMoves.types, variant: c.mods.variant, fast };
  return { fast: fast.name, matchups: opponents.map((o) => matchup(me, o.fighter)) };
}

function tallyText(t: Tally): string {
  const join = (verb: string, parts: string[]) => (parts.length ? [`${verb} ${parts.join(', ')}`] : []);
  const dealt = join('deals', [...(t.moreDealt ? [`more to ${t.moreDealt}`] : []), ...(t.lessDealt ? [`less to ${t.lessDealt}`] : [])]);
  const taken = join('takes', [...(t.lessTaken ? [`less from ${t.lessTaken}`] : []), ...(t.moreTaken ? [`more from ${t.moreTaken}`] : [])]);
  return [...dealt, ...taken].join('; ') || 'the same as the current one';
}

const numbers = (m: Matchup) => `deals ${m.dealt}, takes ${m.taken}`;

function view(side: Side, opponents: OpponentFighter[], current: Side | null): HTMLDetailsElement {
  const details = document.createElement('details');
  details.className = 'matchups';
  const summary = details.appendChild(document.createElement('summary'));
  const head = `With ${side.fast} against the top ${opponents.length} opponents`;
  summary.textContent = current ? `${head}: ${tallyText(tally(current.matchups, side.matchups))}` : head;
  const list = details.appendChild(document.createElement('ul'));
  side.matchups.forEach((m, i) => {
    const after = current ? ` · current ${numbers(current.matchups[i])}` : '';
    list.appendChild(document.createElement('li')).textContent = `${opponents[i].name} (${opponents[i].fast}): ${numbers(m)}${after}`;
  });
  return details;
}

export interface DetailsInput {
  rows: readonly Comparison[];
  candidates: readonly Candidate[];
  opponents: Opponents;
}

/** Per league goal, one matchup view per option (null where there is none). */
export function matchupDetails({ rows, candidates, opponents }: DetailsInput): Partial<Record<GoalId, (HTMLElement | null)[]>> {
  const leagueRows = rows.filter((row): row is Comparison & { goal: LeagueId } => row.goal !== 'raid');
  return Object.fromEntries(leagueRows.map((row) => {
    const list = opponents[row.goal];
    const sides = row.results.map((r, i) => sideOf(candidates[i], r, { league: row.goal, opponents: list }));
    return [row.goal, sides.map((side, i) => side && view(side, list, i === 0 ? null : sides[0]))];
  }));
}

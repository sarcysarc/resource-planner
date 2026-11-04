// Raid moves for each candidate (ADR 0011): the move pickers and the moves to try.
import { VARIANT_MOVES } from '../core/moveset';
import type { PveMove, RaidMoves } from '../core/raid';
import type { Variant } from '../core/types';
import { type Move, MovesFileSchema } from '../data/moves';
import { candidateRoots } from './candidateFields';
import { findSpecies, type Species, type SpeciesIndex } from './species';

export type MovesIndex = Map<string, Move>;

let loading: Promise<MovesIndex> | undefined;

/** Loads moves.json once, as its own chunk, so the main bundle does not carry it. */
export function loadMoves(): Promise<MovesIndex> {
  loading ??= import('../data/moves.json').then(({ default: data }) => {
    const file = MovesFileSchema.parse(data);
    return new Map(file.moves.map((m) => [m.id, m]));
  });
  return loading;
}

function pveOf(moves: MovesIndex, id: string): PveMove | null {
  const m = moves.get(id);
  return m?.pve ? { id: m.id, name: m.name, type: m.type, ...m.pve } : null;
}

const withStats = (moves: MovesIndex, ids: readonly string[]) =>
  ids.flatMap((id) => pveOf(moves, id) ?? []);

export interface MovesSource {
  root: ParentNode;
  target: Species;
  moves: MovesIndex;
}

const picker = (root: ParentNode, name: string) => root.querySelector<HTMLSelectElement>(`select[name="${name}"]`);

function fill(select: HTMLSelectElement | null, options: PveMove[]): void {
  if (!select) return;
  const kept = select.value;
  select.replaceChildren(new Option('Best', ''), ...options.map((m) => new Option(m.name, m.id)));
  select.value = options.some((m) => m.id === kept) ? kept : '';
}

/** Offers "Best" and the target's moves that have raid stats, keeping a pick still offered. */
export function fillMovePickers({ root, target, moves }: MovesSource): void {
  fill(picker(root, 'fastMove'), withStats(moves, target.fast));
  fill(picker(root, 'chargedMove'), withStats(moves, target.charged));
}

function variantMoves(moves: MovesIndex): RaidMoves['variantMoves'] {
  const result: Partial<Record<Variant, PveMove>> = {};
  for (const [variant, ids] of Object.entries(VARIANT_MOVES) as [Variant, string[]][]) {
    const move = ids.length ? pveOf(moves, ids[0]) : null;
    if (move) result[variant] = move;
  }
  return result;
}

/** The moves to try for raids: the picked one on each side, or all with raid stats. */
export function raidMovesFor({ root, target, moves }: MovesSource): RaidMoves {
  const fast = picker(root, 'fastMove')?.value || '';
  const charged = picker(root, 'chargedMove')?.value || '';
  return {
    types: target.types,
    fast: withStats(moves, fast ? [fast] : target.fast),
    charged: withStats(moves, charged ? [charged] : target.charged),
    ...(charged ? {} : { variantMoves: variantMoves(moves) }),
  };
}

export interface MovesWiring {
  target: HTMLInputElement;
  /** Where the candidates are; they can be added at any time. */
  area: ParentNode;
  index: SpeciesIndex;
}

/** Each side's raid moves for this target, once the moves have loaded. */
export type RaidMovesOf = (root: ParentNode, target: Species) => RaidMoves | undefined;

/** Loads the moves, then keeps every side's pickers on the target's moves. */
export function wireMoves({ target, area, index }: MovesWiring): RaidMovesOf {
  let moves: MovesIndex | null = null;
  const refill = () => {
    const species = findSpecies(index, target.value);
    if (moves && species) for (const root of candidateRoots(area)) fillMovePickers({ root, target: species, moves });
  };
  target.addEventListener('change', refill);
  void loadMoves().then((loaded) => {
    moves = loaded;
    refill();
  });
  return (root, species) => (moves ? raidMovesFor({ root, target: species, moves }) : undefined);
}

// Loads the PvP data once and connects it to the form (ADR 0012): the PvP fast move
// pickers follow the target, and each league result gets its matchup view.
import type { Comparison } from '../core/compare';
import type { Candidate } from '../core/goals';
import type { PvpMoves } from '../core/matchups';
import type { PvpFile } from '../data/pvp';
import { matchupDetails, type Opponents, opponentsFrom } from './matchupView';
import { loadMoves, type MovesIndex } from './moves';
import { fillPvpPicker, loadPvp, pvpMovesFor } from './pvpMoves';
import type { Extras } from './render';
import { findSpecies, type Species, type SpeciesIndex } from './species';

export interface PvpWiring {
  target: HTMLInputElement;
  roots: readonly HTMLElement[];
  index: SpeciesIndex;
}

export interface Pvp {
  /** Settles once the data has loaded and the pickers are filled. */
  ready: Promise<void>;
  movesOf(root: ParentNode, target: Species): PvpMoves | undefined;
  details(rows: readonly Comparison[], candidates: readonly Candidate[]): Extras;
}

interface Loaded {
  data: PvpFile;
  moves: MovesIndex;
  opponents: Opponents;
}

export function wirePvp({ target, roots, index }: PvpWiring): Pvp {
  let loaded: Loaded | null = null;
  const refill = () => {
    const species = findSpecies(index, target.value);
    if (loaded && species) for (const root of roots) fillPvpPicker({ root, target: species, moves: loaded.moves });
  };
  target.addEventListener('change', refill);
  const ready = Promise.all([loadPvp(), loadMoves()]).then(([data, moves]) => {
    loaded = { data, moves, opponents: opponentsFrom({ data, index, moves }) };
    refill();
  });
  return {
    ready,
    movesOf: (root, species) => (loaded ? pvpMovesFor({ root, target: species, data: loaded.data, moves: loaded.moves }) : undefined),
    details: (rows, candidates) => (loaded ? matchupDetails({ rows, candidates, opponents: loaded.opponents }) : {}),
  };
}

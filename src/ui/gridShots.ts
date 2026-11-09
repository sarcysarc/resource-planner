// Fills the grid from step 1 (ADR 0015): each Pokémon read from screenshots goes into its
// tile with a thumbnail, in its own line (ADR 0017); the "by hand" buttons add empty tiles
// to type into the open line.
import type { Group } from '../core/screen/merge';
import type { Reading, Totals } from '../core/screen/types';
import { receiveShared } from '../share/receive';
import { targetsOf } from './finals';
import type { Grid } from './grid';
import type { Lines } from './lines';
import { checkCp } from './cpCheck';
import { knownOf, printsOf } from './savedBook';
import { fillResources } from './scanResources';
import { readingFamily, resolveSpecies } from './scanSpecies';
import { addStatus, applySpecies } from './scanTarget';
import { wireScreenshots } from './screenshots';
import { findSpecies, type SpeciesIndex } from './species';
import { type Steps, wireSteps } from './steps';
import { makeThumb } from './thumb';
import { markKnown } from './tileDescribe';
import { fillTile } from './tileFill';
import { setThumb } from './tileView';

export interface GridShots {
  doc: Document;
  grid: Grid;
  index: SpeciesIndex;
  target: HTMLInputElement;
  resources: HTMLElement;
  /** Fills a tile's evolve Candy from what has been read. */
  useEvolve: (root: HTMLElement, reading: Reading) => void;
  /** Saves the grid. */
  save: () => void;
  lines: Lines;
  /** After a batch is in, with the first line read open. */
  afterBatch?: () => void;
}

// The line first read in a batch is the one shown once the batch is in.
interface Batch {
  first?: string;
}

// As if typed, so everything that follows the target updates.
function setTarget(g: GridShots, name: string): void {
  g.target.value = name;
  g.target.dispatchEvent(new Event('change'));
}

// The target each line has, open or not.
const targetOf = (g: GridShots) => (family: string) => g.lines.list().find((l) => l.family === family)?.target ?? '';

// After a tile's fields are filled: the species, the form and the shared totals.
function onRead(g: GridShots): (root: HTMLElement, reading: Reading) => void {
  // As if typed, so everything that follows the target updates.
  const refresh = () => g.target.dispatchEvent(new Event('change'));
  return (root, reading) => {
    const sameFamily = applySpecies({ index: g.index, target: g.target, root, refresh }, reading);
    g.useEvolve(root, reading);
    addStatus(root, fillResources(g.resources, reading.totals ?? {}, sameFamily));
  };
}

// The thumbnail is made first, so its tile can't be in a line closed by the time it is ready.
// A Pokémon of no known family goes into the open line.
function useGroup(g: GridShots, batch: Batch): (group: Group, shot?: File, prints?: string[]) => Promise<void> {
  const fill = { grid: g.grid, familyOf: (r: Reading) => readingFamily(g.index, r), onRead: onRead(g) };
  return async (group, shot, prints) => {
    const src = shot && (await makeThumb(shot));
    const family = fill.familyOf(group.reading);
    if (family) g.lines.open(family);
    if (group.target) setTarget(g, group.target);
    batch.first ??= g.lines.family();
    const root = fillTile(fill, group, prints);
    if (src) setThumb(g.grid.tileOf(root), src);
    g.save();
  };
}

// Each line's call is worked out with step 1 saying so, then step 2 is shown (issue #6).
function done(g: GridShots, batch: Batch, steps: Steps): () => Promise<void> {
  return async () => {
    const first = batch.first;
    batch.first = undefined;
    if (first !== undefined) {
      g.lines.open(first);
      await steps.working(() => g.afterBatch?.());
    }
    g.save();
    steps.reveal();
  };
}

// A Pokémon typed in by hand: what the player leaves alone is taken as they set it.
function addByHand(g: GridShots): HTMLElement {
  const root = g.grid.add();
  markKnown(root, ['variant', 'lucky', 'secondMove']);
  g.grid.refresh(root);
  g.grid.open(root);
  g.save();
  return root;
}

function wireHand(g: GridShots): void {
  g.doc.querySelector('[data-add-tile]')!.addEventListener('click', () => addByHand(g));
  // Skipping screenshots starts with two to compare.
  g.doc.querySelector('[data-step-skip]')!.addEventListener('click', () => {
    while (g.grid.roots().length < 2) addByHand(g);
    g.grid.open(g.grid.roots()[0]);
  });
}

export function wireGridShots(g: GridShots): void {
  const steps = wireSteps(g.doc);
  const batch: Batch = {};
  wireHand(g);
  const read = wireScreenshots({
    root: g.doc.querySelector('[data-shots]')!,
    familyOf: (r) => readingFamily(g.index, r),
    stagesOf: (r) => resolveSpecies(g.index, r),
    targetsOf: targetsOf(g.index, targetOf(g)),
    use: useGroup(g, batch),
    useAccount: (totals: Totals) => fillResources(g.resources, totals, false),
    seen: () => printsOf(g.lines.book()),
    known: () => knownOf(g.lines.book(), (id) => findSpecies(g.index, id)?.name),
    checkCp: (r) => checkCp(g.index, r),
    onDone: done(g, batch, steps),
  });
  // Screenshots shared from the gallery to the installed app (ADR 0010).
  void receiveShared(window).then(read);
}

// Fills the grid from step 1 (ADR 0015): each Pokémon read from screenshots goes into its
// tile with a thumbnail; the "by hand" buttons add empty tiles to type into.
import type { Group } from '../core/screen/merge';
import type { Reading, Totals } from '../core/screen/types';
import { receiveShared } from '../share/receive';
import type { Grid } from './grid';
import { fillResources } from './scanResources';
import { readingFamily, resolveSpecies } from './scanSpecies';
import { addStatus, applySpecies } from './scanTarget';
import { wireScreenshots } from './screenshots';
import type { SpeciesIndex } from './species';
import { wireSteps } from './steps';
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
}

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

function useGroup(g: GridShots): (group: Group, shot?: File) => void {
  const fill = { grid: g.grid, familyOf: (r: Reading) => readingFamily(g.index, r), onRead: onRead(g) };
  return (group, shot) => {
    const root = fillTile(fill, group);
    g.save();
    if (!shot) return;
    void makeThumb(shot).then((src) => src && (setThumb(g.grid.tileOf(root), src), g.save()));
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
  const { reveal } = wireSteps(g.doc);
  wireHand(g);
  const read = wireScreenshots({
    root: g.doc.querySelector('[data-shots]')!,
    familyOf: (r) => readingFamily(g.index, r),
    stagesOf: (r) => resolveSpecies(g.index, r),
    use: useGroup(g),
    useAccount: (totals: Totals) => fillResources(g.resources, totals, false),
    onDone: reveal,
  });
  // Screenshots shared from the gallery to the installed app (ADR 0010).
  void receiveShared(window).then(read);
}

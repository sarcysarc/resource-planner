// Puts the page together (ADR 0014, 0015): screenshots fill a grid of Pokémon from one
// evolution line, and the current one is compared with the rest.
import { buildCandidateFields } from './candidateFields';
import { wireEvolve } from './evolveMemory';
import { wireFinder } from './finder';
import { wireFormChoices } from './formChoices';
import { createGrid, type Grid } from './grid';
import { openStore, persistGrid } from './gridPersist';
import { hideSaved, type SavedSummary, showSaved } from './steps';
import { wireGridShots } from './gridShots';
import { wireLineList } from './lineList';
import { wireMoves } from './moves';
import { wirePvp } from './pvpWiring';
import { runCompare } from './runCompare';
import { wireSearches } from './searchHelp';
import { loadBundledIndex, type SpeciesIndex } from './species';
import { describeTile } from './tileDescribe';
import { trackEdits } from './tileFill';

interface Page {
  doc: Document;
  form: HTMLFormElement;
  target: HTMLInputElement;
  resources: HTMLElement;
  details: HTMLElement;
  index: SpeciesIndex;
}

const q = <T extends HTMLElement>(doc: Document, selector: string) => doc.querySelector<T>(selector)!;

// Where the game data comes from, and whose it is (ADR 0011, 0012).
const dataCredit = (timestamp: string) =>
  `Game data: PvPoke game master and rankings, ${timestamp}; raid move stats from PokeMiners. ` +
  'The game data belongs to Niantic and The Pokémon Company.';

function fillSpeciesList(list: HTMLDataListElement, index: SpeciesIndex): void {
  list.replaceChildren(...index.all.map((s) => new Option(s.name, s.name)));
}

// A new tile gets its fields, then catches up with the target as if it had just been typed.
function mountGrid({ doc, target, details, index }: Page): Grid {
  const prepare = (root: HTMLElement) => {
    buildCandidateFields(root);
    wireFinder({ root, index });
    target.dispatchEvent(new Event('change'));
  };
  const parts = { grid: q(doc, '[data-grid]'), details, transfer: q(doc, '[data-transfers]') };
  return createGrid({ parts, prepare, describe: describeTile });
}

function pageOf(doc: Document): Page {
  const index = loadBundledIndex();
  const form = q<HTMLFormElement>(doc, '#planner');
  return { doc, form, target: q(doc, '#target'), resources: q(doc, '[data-resources]'), details: q(doc, '[data-details]'), index };
}

export function mountApp(doc: Document): void {
  const page = pageOf(doc);
  const { form, target, details: area, index } = page;
  // The form lists follow the target before the evolve totals are refilled.
  wireFormChoices({ target, area, index });
  const useEvolve = wireEvolve({ index, target, area });
  const grid = mountGrid(page);
  trackEdits(area);
  const saved = { onRestore: (summary: SavedSummary) => showSaved(doc, summary), onClear: () => hideSaved(doc) };
  const { lines, save } = persistGrid({ grid, target, resources: page.resources, area: form, ...saved }, openStore());
  wireGridShots({ doc, grid, index, target, resources: page.resources, useEvolve, save, lines });
  wireLineList({ nav: q(doc, '[data-lines]'), grid: q(doc, '[data-grid]'), lines, index, onOpen: save });
  fillSpeciesList(q(doc, '#species-list'), index);
  q(doc, '#data-info').textContent = dataCredit(index.timestamp);
  wireSearches({ target, root: q(doc, '[data-searches]'), index });
  const moves = { raidMovesOf: wireMoves({ target, area, index }), pvp: wirePvp({ target, area, index }) };
  const planner = { form, target, resources: page.resources, results: q(doc, '#results'), index, moves, grid };
  form.addEventListener('submit', (event) => (event.preventDefault(), runCompare(planner)));
}

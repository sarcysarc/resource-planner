// Puts the page together (ADR 0014, 0015): screenshots fill a grid of Pokémon from one
// evolution line, and the current one is compared with the rest.
import { buildCandidateFields } from './candidateFields';
import { loadBundledEvolve } from './evolveData';
import { wireEvolve } from './evolveMemory';
import { showError } from './fieldError';
import { wireFinder } from './finder';
import { wireFormChoices } from './formChoices';
import { createGrid, type Grid } from './grid';
import { openStore, persistGrid } from './gridPersist';
import { hideSaved, type SavedSummary, showSaved } from './steps';
import { wireGridShots } from './gridShots';
import { judgeLines } from './lineCall';
import { wireLineClear } from './lineClear';
import { wireLineList } from './lineList';
import type { Lines } from './lines';
import { wireMoves } from './moves';
import { wirePvp } from './pvpWiring';
import { judgeLine, type Planner, runCompare } from './runCompare';
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
  `Game data: PvPoke game master and rankings, ${timestamp}; raid move stats, Candy to evolve and purify costs from PokeMiners. ` +
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

interface Calls {
  planner: Planner;
  lines: Lines;
  /** Redraws step 2's list of lines. */
  render: () => void;
  save: () => void;
}

// Each line's call (ADR 0017): every line's after a batch, the open one's on Compare.
function wireCalls(c: Calls, after: { batch: () => void }): void {
  after.batch = () => (judgeLines(c.lines, () => judgeLine(c.planner)), c.render());
  c.planner.form.addEventListener('submit', (event) => {
    event.preventDefault();
    c.lines.setCall(c.lines.family(), runCompare(c.planner));
    c.render();
    c.save();
  });
}

// Results and errors belong to the line they were worked out for (issue #8).
function dropShown({ doc, form }: Page): void {
  q(doc, '#results').replaceChildren();
  showError(form, '');
}

// Step 2's list of lines and the open line's Clear; gives a function that redraws the list.
function wireLines(page: Page, lines: Lines, save: () => void): () => void {
  const { doc, index } = page;
  const list = { nav: q(doc, '[data-lines]'), lines, index, clear: q(doc, '[data-clear-line]') };
  const onOpen = () => (dropShown(page), save());
  const render = wireLineList({ ...list, grid: q(doc, '[data-grid]'), onOpen });
  wireLineClear({ ...list, button: list.clear, after: () => (render(), onOpen()) });
  return render;
}

export function mountApp(doc: Document): void {
  const page = pageOf(doc);
  const { form, target, details: area, index } = page;
  // The form lists follow the target before the evolve totals are refilled.
  wireFormChoices({ target, area, index });
  const useEvolve = wireEvolve({ index, target, area, known: loadBundledEvolve() });
  const grid = mountGrid(page);
  trackEdits(area);
  const saved = { onRestore: (summary: SavedSummary) => showSaved(doc, summary), onClear: () => hideSaved(doc) };
  const { lines, save } = persistGrid({ grid, target, resources: page.resources, area: form, ...saved }, openStore());
  const after = { batch: () => {} };
  wireGridShots({ doc, grid, index, target, resources: page.resources, useEvolve, save, lines, afterBatch: () => after.batch() });
  const render = wireLines(page, lines, save);
  fillSpeciesList(q(doc, '#species-list'), index);
  q(doc, '#data-info').textContent = dataCredit(index.timestamp);
  wireSearches({ target, root: q(doc, '[data-searches]'), index });
  const moves = { raidMovesOf: wireMoves({ target, area, index }), pvp: wirePvp({ target, area, index }) };
  const planner = { form, target, resources: page.resources, results: q(doc, '#results'), index, moves, grid };
  wireCalls({ planner, lines, render, save }, after);
}

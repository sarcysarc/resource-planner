import { compare, type CompareInput } from '../core/compare';
import { purifyCost } from '../data/purify';
import { powerUpLimit } from '../core/levels';
import type { Reading, Totals } from '../core/screen/types';
import { receiveShared } from '../share/receive';
import { type Rare, readAccount } from './account';
import { buildCandidateFields } from './candidateFields';
import { wireEvolve } from './evolveMemory';
import { wireFinder } from './finder';
import { fillCandidate, wireScreenshot } from './screenshot';
import { type Side, wireScreenshots } from './screenshots';
import { formOf, readCandidate, readResources, type Result } from './form';
import type { OptionLabel } from './format';
import { type RaidMovesOf, wireMoves } from './moves';
import { buildOptions, type OptionSide } from './options';
import { type Pvp, wirePvp } from './pvpWiring';
import { fillResources } from './scanResources';
import { readingFamily } from './scanSpecies';
import { addStatus, applySpecies } from './scanTarget';
import { renderComparisons } from './render';
import { wireSearches } from './searchHelp';
import { wireSteps } from './steps';
import { evolutionLine, findSpecies, type Species, type SpeciesIndex, loadBundledIndex } from './species';

interface Elements {
  form: HTMLFormElement;
  target: HTMLInputElement;
  speciesList: HTMLDataListElement;
  current: HTMLElement;
  alternative: HTMLElement;
  resources: HTMLElement;
  shots: HTMLElement;
  searches: HTMLElement;
  results: HTMLElement;
  error: HTMLElement;
  dataInfo: HTMLElement;
}

function queryElements(doc: Document): Elements {
  const q = <T extends HTMLElement>(selector: string) => doc.querySelector<T>(selector)!;
  return {
    form: q('#planner'),
    target: q('#target'),
    speciesList: q('#species-list'),
    current: q('[data-candidate="current"]'),
    alternative: q('[data-candidate="alternative"]'),
    resources: q('[data-resources]'),
    shots: q('[data-shots]'),
    searches: q('[data-searches]'),
    results: q('#results'),
    error: q('#error'),
    dataInfo: q('#data-info'),
  };
}

function fillSpeciesList(list: HTMLDataListElement, index: SpeciesIndex): void {
  const options = index.all.map((s) => new Option(s.name, s.name));
  list.replaceChildren(...options);
}

const formSelect = (root: ParentNode) => root.querySelector<HTMLSelectElement>('select[name="form"]')!;

// A form someone or a screenshot chose is kept while it is still in the new line, so
// moving the target up a line leaves an earlier stage alone.
function updateFormChoices(els: Elements, index: SpeciesIndex): void {
  const target = findSpecies(index, els.target.value);
  if (!target) return;
  const line = evolutionLine(index, target);
  for (const select of [els.current, els.alternative].map(formSelect)) {
    const chosen = select.dataset.chosen;
    select.replaceChildren(...line.map((s) => new Option(s.name, s.id)));
    select.value = line.some((s) => s.id === chosen) ? chosen! : target.id;
  }
}

function wireFormChoices(els: Elements, index: SpeciesIndex): void {
  els.target.addEventListener('change', () => updateFormChoices(els, index));
  for (const select of [els.current, els.alternative].map(formSelect)) {
    select.addEventListener('change', () => (select.dataset.chosen = select.value));
  }
}

interface Inputs {
  compare: CompareInput;
  rare: Rare;
  labels: OptionLabel[];
  notes: string[];
}

interface SideSource {
  root: HTMLElement;
  index: SpeciesIndex;
  target: Species;
  label: string;
  moves: SideMoves;
}

// Each side's moves, read when the form is: raids (ADR 0011) and PvP (ADR 0012).
interface SideMoves {
  raidMovesOf: RaidMovesOf;
  pvp: Pvp;
}

function readSide({ label, moves, ...source }: SideSource): Result<OptionSide> {
  const read = readCandidate(source);
  if (!read.ok) return { ok: false, error: `${label}: ${read.error}` };
  const form = formOf(source)!;
  const { root, target } = source;
  const candidate = { ...read.value, raidMoves: moves.raidMovesOf(root, target), pvpMoves: moves.pvp.movesOf(root, target) };
  return { ok: true, value: { candidate, purify: purifyCost(form.secondMoveDust), formName: form.name } };
}

// What reading the form needs: the page, the species and each side's moves.
interface App {
  els: Elements;
  index: SpeciesIndex;
  moves: SideMoves;
}

function readInputs({ els, index, moves }: App): Result<Inputs> {
  const target = findSpecies(index, els.target.value);
  if (!target) return { ok: false, error: 'Pick the Pokémon you will battle with from the list' };
  const account = readAccount(els.resources);
  if (!account.ok) return { ok: false, error: `Resources: ${account.error}` };
  const maxLevel = powerUpLimit(account.value.trainerLevel);
  const current = readSide({ root: els.current, index, target, label: 'Current', moves });
  if (!current.ok) return current;
  const alternative = readSide({ root: els.alternative, index, target, label: 'Alternative', moves });
  if (!alternative.ok) return alternative;
  const resources = readResources(els.resources);
  if (!resources.ok) return { ok: false, error: `Resources: ${resources.error}` };
  const { candidates, labels, notes } = buildOptions([current.value, alternative.value]);
  const compare = { candidates: candidates.map((c) => ({ ...c, maxLevel })), resources: resources.value };
  return { ok: true, value: { compare, rare: account.value.rare, labels, notes } };
}

function run(app: App): void {
  const { els } = app;
  const input = readInputs(app);
  els.error.textContent = input.ok ? '' : input.error;
  if (!input.ok) return;
  const { compare: sides, rare, labels, notes } = input.value;
  const rows = compare(sides);
  const extras = app.moves.pvp.details(rows, sides.candidates);
  renderComparisons({ container: els.results, options: labels, rows, resources: sides.resources, rare, notes, extras });
  // On a phone the results are below a long form.
  els.results.scrollIntoView({ block: 'start' });
}

// After a candidate's fields are filled: the species, the form and the shared totals.
type OnRead = (root: HTMLElement, reading: Reading) => void;

function useReading(els: Elements, index: SpeciesIndex, useEvolve: OnRead): OnRead {
  // As if typed, so everything that follows the target updates.
  const refresh = () => els.target.dispatchEvent(new Event('change'));
  return (root, reading) => {
    const sameFamily = applySpecies({ index, target: els.target, root, refresh }, reading);
    useEvolve(root, reading);
    addStatus(root, fillResources(els.resources, reading.totals ?? {}, sameFamily));
  };
}

function wireShared(els: Elements, index: SpeciesIndex, onRead: OnRead): void {
  const { reveal } = wireSteps(els.form.ownerDocument);
  const use = (side: Side, group: Parameters<typeof fillCandidate>[1]) => {
    fillCandidate(els[side], group);
    onRead(els[side], group.reading);
  };
  const useAccount = (totals: Totals) => fillResources(els.resources, totals, false);
  const familyOf = (reading: Reading) => readingFamily(index, reading);
  const read = wireScreenshots({ root: els.shots, familyOf, use, useAccount, onDone: reveal });
  // Screenshots shared from the gallery to the installed app (ADR 0010).
  void receiveShared(window).then(read);
}

// Where the game data comes from, and whose it is (ADR 0011, 0012).
const dataCredit = (timestamp: string) =>
  `Game data: PvPoke game master and rankings, ${timestamp}; raid move stats from PokeMiners. ` +
  'The game data belongs to Niantic and The Pokémon Company.';

export function mountApp(doc: Document): void {
  const index = loadBundledIndex();
  const els = queryElements(doc);
  const roots = [els.current, els.alternative];
  // The form choices follow the target before the evolve totals are refilled.
  roots.forEach(buildCandidateFields);
  wireFormChoices(els, index);
  const onRead = useReading(els, index, wireEvolve({ index, target: els.target, roots }));
  for (const root of roots) {
    wireFinder({ root, index });
    wireScreenshot(root, (reading) => onRead(root, reading));
  }
  wireShared(els, index, onRead);
  fillSpeciesList(els.speciesList, index);
  els.dataInfo.textContent = dataCredit(index.timestamp);
  wireSearches({ target: els.target, root: els.searches, index });
  const wiring = { target: els.target, roots, index };
  const app = { els, index, moves: { raidMovesOf: wireMoves(wiring), pvp: wirePvp(wiring) } };
  els.form.addEventListener('submit', (event) => (event.preventDefault(), run(app)));
}

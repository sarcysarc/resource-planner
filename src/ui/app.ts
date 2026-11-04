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
import { buildOptions, type OptionSide } from './options';
import { fillResources } from './scanResources';
import { readingFamily } from './scanSpecies';
import { addStatus, applySpecies } from './scanTarget';
import { renderComparisons } from './render';
import { wireSearches } from './searchHelp';
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

function updateFormChoices(els: Elements, index: SpeciesIndex): void {
  const target = findSpecies(index, els.target.value);
  if (!target) return;
  const line = evolutionLine(index, target);
  for (const side of [els.current, els.alternative]) {
    const select = side.querySelector<HTMLSelectElement>('select[name="form"]')!;
    select.replaceChildren(...line.map((s) => new Option(s.name, s.id)));
    select.value = target.id;
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
}

function readSide({ label, ...source }: SideSource): Result<OptionSide> {
  const read = readCandidate(source);
  if (!read.ok) return { ok: false, error: `${label}: ${read.error}` };
  const form = formOf(source)!;
  return { ok: true, value: { candidate: read.value, purify: purifyCost(form.secondMoveDust), formName: form.name } };
}

function readInputs(els: Elements, index: SpeciesIndex): Result<Inputs> {
  const target = findSpecies(index, els.target.value);
  if (!target) return { ok: false, error: 'Pick the Pokémon you will battle with from the list' };
  const account = readAccount(els.resources);
  if (!account.ok) return { ok: false, error: `Resources: ${account.error}` };
  const maxLevel = powerUpLimit(account.value.trainerLevel);
  const current = readSide({ root: els.current, index, target, label: 'Current' });
  if (!current.ok) return current;
  const alternative = readSide({ root: els.alternative, index, target, label: 'Alternative' });
  if (!alternative.ok) return alternative;
  const resources = readResources(els.resources);
  if (!resources.ok) return { ok: false, error: `Resources: ${resources.error}` };
  const { candidates, labels, notes } = buildOptions([current.value, alternative.value]);
  const compare = { candidates: candidates.map((c) => ({ ...c, maxLevel })), resources: resources.value };
  return { ok: true, value: { compare, rare: account.value.rare, labels, notes } };
}

function run(els: Elements, index: SpeciesIndex): void {
  const input = readInputs(els, index);
  els.error.textContent = input.ok ? '' : input.error;
  if (!input.ok) return;
  const { compare: sides, rare, labels, notes } = input.value;
  renderComparisons({ container: els.results, options: labels, rows: compare(sides), resources: sides.resources, rare, notes });
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
  const use = (side: Side, group: Parameters<typeof fillCandidate>[1]) => {
    fillCandidate(els[side], group);
    onRead(els[side], group.reading);
  };
  const useAccount = (totals: Totals) => fillResources(els.resources, totals, false);
  const read = wireScreenshots({ root: els.shots, familyOf: (reading) => readingFamily(index, reading), use, useAccount });
  // Screenshots shared from the gallery to the installed app (ADR 0010).
  void receiveShared(window).then(read);
}

export function mountApp(doc: Document): void {
  const index = loadBundledIndex();
  const els = queryElements(doc);
  const roots = [els.current, els.alternative];
  // The form choices follow the target before the evolve totals are refilled.
  els.target.addEventListener('change', () => updateFormChoices(els, index));
  const onRead = useReading(els, index, wireEvolve({ index, target: els.target, roots }));
  for (const root of roots) {
    buildCandidateFields(root);
    wireFinder({ root, index });
    wireScreenshot(root, (reading) => onRead(root, reading));
  }
  wireShared(els, index, onRead);
  fillSpeciesList(els.speciesList, index);
  els.dataInfo.textContent = `Game data: PvPoke game master, ${index.timestamp}.`;
  wireSearches({ target: els.target, root: els.searches, index });
  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    run(els, index);
  });
}

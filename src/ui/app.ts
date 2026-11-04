import { compare, type CompareInput } from '../core/compare';
import { powerUpLimit } from '../core/levels';
import type { Reading, Totals } from '../core/screen/types';
import { type Rare, readAccount } from './account';
import { buildCandidateFields } from './candidateFields';
import { wireFinder } from './finder';
import { fillCandidate, wireScreenshot } from './screenshot';
import { type Side, wireScreenshots } from './screenshots';
import { readCandidate, readResources, type Result } from './form';
import { fillResources } from './scanResources';
import { readingFamily } from './scanSpecies';
import { addStatus, applySpecies } from './scanTarget';
import { renderComparisons } from './render';
import { wireSearches } from './searchHelp';
import { evolutionLine, findSpecies, type SpeciesIndex, loadBundledIndex } from './species';

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
}

function readInputs(els: Elements, index: SpeciesIndex): Result<Inputs> {
  const target = findSpecies(index, els.target.value);
  if (!target) return { ok: false, error: 'Pick the Pokémon you will battle with from the list' };
  const account = readAccount(els.resources);
  if (!account.ok) return { ok: false, error: `Resources: ${account.error}` };
  const maxLevel = powerUpLimit(account.value.trainerLevel);
  const current = readCandidate({ root: els.current, index, target });
  if (!current.ok) return { ok: false, error: `Current: ${current.error}` };
  const alternative = readCandidate({ root: els.alternative, index, target });
  if (!alternative.ok) return { ok: false, error: `Alternative: ${alternative.error}` };
  const resources = readResources(els.resources);
  if (!resources.ok) return { ok: false, error: `Resources: ${resources.error}` };
  const compare = { current: { ...current.value, maxLevel }, alternative: { ...alternative.value, maxLevel }, resources: resources.value };
  return { ok: true, value: { compare, rare: account.value.rare } };
}

function run(els: Elements, index: SpeciesIndex): void {
  const input = readInputs(els, index);
  els.error.textContent = input.ok ? '' : input.error;
  if (!input.ok) return;
  const { compare: sides, rare } = input.value;
  renderComparisons({ container: els.results, rows: compare(sides), resources: sides.resources, rare });
}

// After a candidate's fields are filled: the species, the form and the shared totals.
function useReading(els: Elements, index: SpeciesIndex, root: HTMLElement): (reading: Reading) => void {
  // As if typed, so everything that follows the target updates.
  const refresh = () => els.target.dispatchEvent(new Event('change'));
  return (reading) => {
    const sameFamily = applySpecies({ index, target: els.target, root, refresh }, reading);
    addStatus(root, fillResources(els.resources, reading.totals ?? {}, sameFamily));
  };
}

function wireShared(els: Elements, index: SpeciesIndex): void {
  const use = (side: Side, group: Parameters<typeof fillCandidate>[1]) => {
    const root = els[side];
    fillCandidate(root, group);
    useReading(els, index, root)(group.reading);
  };
  const useAccount = (totals: Totals) => fillResources(els.resources, totals, false);
  wireScreenshots({ root: els.shots, familyOf: (reading) => readingFamily(index, reading), use, useAccount });
}

export function mountApp(doc: Document): void {
  const index = loadBundledIndex();
  const els = queryElements(doc);
  for (const root of [els.current, els.alternative]) {
    buildCandidateFields(root);
    wireFinder({ root, index });
    wireScreenshot(root, useReading(els, index, root));
  }
  wireShared(els, index);
  fillSpeciesList(els.speciesList, index);
  els.dataInfo.textContent = `Game data: PvPoke game master, ${index.timestamp}.`;
  els.target.addEventListener('change', () => updateFormChoices(els, index));
  wireSearches({ target: els.target, root: els.searches, index });
  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    run(els, index);
  });
}

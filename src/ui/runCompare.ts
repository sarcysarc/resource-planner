// Reads the grid and shows the answer (ADR 0015): the current Pokémon against every other
// one not marked for transfer, ranked, with the ones worth transferring suggested.
import { compare, type CompareInput } from '../core/compare';
import { powerUpLimit } from '../core/levels';
import { purifyCostOf } from './purifyData';
import { type Rare, readAccount } from './account';
import { type ErrorPlace, showError } from './fieldError';
import { formOf, readCandidate, readResources, type Result } from './form';
import type { Grid } from './grid';
import { callOf, MORE, reasonOf } from './lineCall';
import type { RaidMovesOf } from './moves';
import { buildOptions, type Options, type OptionSide } from './options';
import type { Pvp } from './pvpWiring';
import { transferSuggestions } from './ranking';
import { renderComparisons } from './render';
import type { LineCall } from './savedBook';
import { findSpecies, type Species, type SpeciesIndex } from './species';
import { describeTile } from './tileDescribe';

// Each Pokémon's moves, read when the form is: raids (ADR 0011) and PvP (ADR 0012).
export interface SideMoves {
  raidMovesOf: RaidMovesOf;
  pvp: Pvp;
}

export interface Planner {
  form: HTMLFormElement;
  target: HTMLInputElement;
  resources: HTMLElement;
  results: HTMLElement;
  index: SpeciesIndex;
  moves: SideMoves;
  grid: Grid;
}

type Read<T> = { ok: true; value: T } | { ok: false; error: string; at?: ErrorPlace };

interface Inputs {
  compare: CompareInput;
  rare: Rare;
  options: Options;
  roots: HTMLElement[];
}

function readSide(p: Planner, root: HTMLElement, target: Species): Read<OptionSide> {
  const title = describeTile(root).title;
  const source = { root, index: p.index, target };
  const read = readCandidate(source);
  if (!read.ok) return { ok: false, error: `${title}: ${read.error}`, at: { part: root, prefix: `${title}: ` } };
  const form = formOf(source)!;
  const candidate = { ...read.value, raidMoves: p.moves.raidMovesOf(root, target), pvpMoves: p.moves.pvp.movesOf(root, target) };
  return { ok: true, value: { candidate, purify: purifyCostOf(form.id), formName: form.name, title } };
}

function readSides(p: Planner, roots: HTMLElement[], target: Species): Read<OptionSide[]> {
  if (roots.length < 2) return { ok: false, error: MORE };
  const sides: OptionSide[] = [];
  for (const root of roots) {
    const side = readSide(p, root, target);
    if (!side.ok) return side;
    sides.push(side.value);
  }
  return { ok: true, value: sides };
}

function readInputs(p: Planner): Read<Inputs> {
  const target = findSpecies(p.index, p.target.value);
  if (!target) return { ok: false, error: 'Pick the Pokémon you will battle with from the list' };
  const account = readAccount(p.resources);
  if (!account.ok) return { ok: false, error: `Resources: ${account.error}` };
  const roots = p.grid.compared();
  const sides = readSides(p, roots, target);
  if (!sides.ok) return sides;
  const resources: Result<CompareInput['resources']> = readResources(p.resources);
  if (!resources.ok) return { ok: false, error: `Resources: ${resources.error}` };
  const options = buildOptions(sides.value);
  const maxLevel = powerUpLimit(account.value.trainerLevel);
  const candidates = options.candidates.map((c) => ({ ...c, maxLevel }));
  return { ok: true, value: { compare: { candidates, resources: resources.value }, rare: account.value.rare, options, roots } };
}

function suggest(p: Planner, { options, roots }: Inputs, rows: ReturnType<typeof compare>): void {
  const ids = options.owners.map((i) => roots[i].dataset.tile!);
  const names = Object.fromEntries(roots.map((r) => [r.dataset.tile!, describeTile(r).title]));
  p.grid.suggest(transferSuggestions(rows, ids, names));
}

function fail(p: Planner, error: string, at?: ErrorPlace): LineCall {
  showError(p.form, error, at);
  if (at) p.grid.open(at.part);
  return { text: reasonOf(error, p.grid.compared()) };
}

/** The open line's call, worked out without showing anything (ADR 0017). */
export function judgeLine(p: Planner): LineCall {
  const input = readInputs(p);
  if (!input.ok) return { text: reasonOf(input.error, p.grid.compared()) };
  return callOf(input.value.options.labels, compare(input.value.compare));
}

/** Compares the open line and shows the results; gives the line's call. */
export function runCompare(p: Planner): LineCall {
  const input = readInputs(p);
  if (!input.ok) return fail(p, input.error, input.at);
  showError(p.form, '');
  const { compare: sides, rare, options } = input.value;
  const rows = compare(sides);
  suggest(p, input.value, rows);
  const extras = p.moves.pvp.details(rows, sides.candidates);
  renderComparisons({ container: p.results, options: options.labels, rows, resources: sides.resources, rare, notes: options.notes, extras });
  // On a phone the results are below a long form.
  p.results.scrollIntoView({ block: 'start' });
  return callOf(options.labels, rows);
}

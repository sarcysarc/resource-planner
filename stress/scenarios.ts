// Which screenshots are uploaded together in the stress run, and the tiles each should give
// (ADR 0016).
import type { Truth } from './truth';

export interface Scenario {
  scenario: string;
  shots: string[];
  ids: string[];
}

export interface TileSeen {
  title: string;
  notes: string[];
  thumb?: string;
}

export interface Outcome {
  scenario: string;
  want: { id: string; title: string; shots: string[] }[];
  status: string;
  asked: string;
  tiles: TileSeen[];
}

const shotsOf = (truth: Truth, id: string) => Object.keys(truth.shots).filter((name) => truth.shots[name].id === id);

/** The tile one Pokémon should give: its title, and the screenshots its thumbnail may come from. */
export function tileWanted(truth: Truth, id: string): Outcome['want'][number] {
  const { name, cp, ivs } = truth.pokemon[id];
  const shots = shotsOf(truth, id);
  // A Pokémon that covers its CP on every screenshot gives a tile with no CP.
  const shown = shots.some((s) => typeof truth.shots[s].cp === 'number') ? `, CP ${cp}` : '';
  return { id, title: `${name}${shown}, ${ivs ? `IVs ${ivs.join('/')}` : 'IVs not known'}`, shots };
}

const group = (truth: Truth, label: string, ids: string[]): Scenario => ({
  scenario: label,
  shots: ids.flatMap((id) => shotsOf(truth, id)),
  ids,
});

// One grid per evolution line (ADR 0015): all its screenshots, then its appraisals alone, then
// mixed with menus and lists that should be ignored.
function lineScenarios(truth: Truth, line: string, ids: string[]): Scenario[] {
  const all = group(truth, `line: ${line}`, ids);
  const appraisals = all.shots.filter((name) => truth.shots[name].screen === 'appraisal');
  const others = Object.keys(truth.shots).filter((name) => truth.shots[name].screen === 'other');
  const appraised = ids.filter((id) => appraisals.some((name) => truth.shots[name].id === id));
  return [all, { scenario: `line: ${line}, appraisals only`, shots: appraisals, ids: appraised }, { ...all, scenario: `line: ${line}, with menus and lists`, shots: [...all.shots, ...others] }];
}

/** Each Pokémon on its own, each line with more than one, then every line at once. */
export function scenarios(truth: Truth): Scenario[] {
  const ids = Object.keys(truth.pokemon);
  const lines = [...new Set(ids.map((id) => truth.pokemon[id].line))];
  const shared = lines.map((line) => [line, ids.filter((id) => truth.pokemon[id].line === line)] as const).filter(([, members]) => members.length > 1);
  return [
    ...ids.map((id) => group(truth, `one: ${id}`, [id])),
    ...shared.flatMap(([line, members]) => lineScenarios(truth, line, members)),
    group(truth, 'every line at once (a grid holds one line)', ids),
  ];
}

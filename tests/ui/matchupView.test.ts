// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { Comparison } from '../../src/core/compare';
import type { GoalResult } from '../../src/core/goals';
import type { PvpMoves } from '../../src/core/matchups';
import type { Move } from '../../src/data/moves';
import type { PvpFile } from '../../src/data/pvp';
import { matchupDetails, opponentsFrom } from '../../src/ui/matchupView';
import type { MovesIndex } from '../../src/ui/moves';
import { buildIndex } from '../../src/ui/species';
import { candidate } from '../core/fixtures';

const species = (id: string, types: string[]) => ({
  id, name: id[0].toUpperCase() + id.slice(1), dex: 1, base: { atk: 150, def: 150, hp: 150 }, types,
  family: id, parent: null, secondMoveDust: 10000, fast: [], charged: [],
});
const index = buildIndex({
  schemaVersion: 3, source: 'test', timestamp: 't', species: [species('ember', ['fire']), species('leaf', ['grass'])],
});

const move = (id: string, type: string): Move =>
  ({ id, name: id[0] + id.slice(1).toLowerCase(), type, kind: 'fast', pvp: { power: 5, energy: 8, turns: 2 }, pve: null });
const moves: MovesIndex = new Map([move('SCORCH', 'fire'), move('RUSTLE', 'grass')].map((m) => [m.id, m]));

const opponent = (id: string, fast: string, variant = 'normal') => ({ id, variant, fast, level: 20, ivs: { atk: 0, def: 15, hp: 15 } });
const league = { opponents: [opponent('ember', 'SCORCH'), opponent('leaf', 'RUSTLE'), opponent('ghost', 'RUSTLE'), opponent('leaf', 'RUSTLE', 'shadow')], picks: {} };
const data = { leagues: { great: league, ultra: league, master: league } } as unknown as PvpFile;

const hit = { name: 'Splash', power: 6, type: 'water' };
const pvpMoves: PvpMoves = { types: ['water'], fast: { great: hit, ultra: hit, master: hit } };

const result = (effectiveLevel: number): GoalResult => ({
  eligible: true, targetLevel: effectiveLevel, effectiveLevel, cp: 1400, value: 1, basis: 'statProduct',
  cost: { stardust: 0, candy: 0, xl: 0 }, parts: [],
});
const row = (results: GoalResult[]) => ({ goal: 'great', results, verdict: { kind: 'keep' }, changes: [] }) as unknown as Comparison;

const opponents = opponentsFrom({ data, index, moves });

describe('opponentsFrom', () => {
  it('builds each opponent the species index knows, naming Shadows', () => {
    expect(opponents.great.map((o) => `${o.name} (${o.fast})`)).toEqual(['Ember (Scorch)', 'Leaf (Rustle)', 'Shadow Leaf (Rustle)']);
  });
});

describe('matchupDetails', () => {
  const candidates = [candidate({ pvpMoves }), candidate({ pvpMoves, mods: { variant: 'shadow', lucky: false } })];
  const details = matchupDetails({ rows: [row([result(30), result(30)])], candidates, opponents });

  it('lists the current option’s damage per fast move against each opponent', () => {
    const current = details.great![0]!;
    expect(current.querySelector('summary')!.textContent).toBe('With Splash against the 3 most-used opponents');
    expect(current.querySelectorAll('li')).toHaveLength(3);
    expect(current.querySelector('li')!.textContent).toMatch(/^Ember \(Scorch\): deals \d+, takes \d+$/);
  });

  it('compares another option with the current one', () => {
    const shadow = details.great![1]!;
    expect(shadow.querySelector('summary')!.textContent).toMatch(/^With Splash against the 3 most-used opponents: deals more to \d/);
    expect(shadow.querySelector('li')!.textContent).toMatch(/· current deals \d+, takes \d+$/);
  });

  it('leaves out options without moves or over the cap', () => {
    const over: GoalResult = { eligible: false, reason: 'over-cap' };
    const out = matchupDetails({ rows: [row([over, result(30)])], candidates: [candidate(), candidate({ pvpMoves })], opponents });
    expect(out.great![0]).toBeNull();
    expect(out.great![1]!.querySelector('summary')!.textContent).toBe('With Splash against the 3 most-used opponents');
  });

  it('says when an option matches the current one everywhere', () => {
    const same = matchupDetails({ rows: [row([result(30), result(30)])], candidates: [candidates[0], candidates[0]], opponents });
    expect(same.great![1]!.querySelector('summary')!.textContent).toBe('With Splash against the 3 most-used opponents: the same as the current one');
  });

  it('skips the raid goal', () => {
    const raid = { ...row([result(30)]), goal: 'raid' } as Comparison;
    expect(matchupDetails({ rows: [raid], candidates, opponents }).raid).toBeUndefined();
  });
});

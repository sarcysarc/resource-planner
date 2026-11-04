import { describe, expect, it } from 'vitest';
import type { Comparison } from '../../src/core/compare';
import type { GoalResult } from '../../src/core/goals';
import { listNames, rankOptions, transferSuggestions } from '../../src/ui/ranking';

const cost = { stardust: 0, candy: 0, xl: 0 };
const ok = (value: number): GoalResult => ({ eligible: true, value, cost, level: 40, cp: 1000, parts: [] }) as unknown as GoalResult;
const out: GoalResult = { eligible: false } as GoalResult;

function row(results: GoalResult[], verdict: Comparison['verdict']): Comparison {
  return { goal: 'great', results, verdict, changes: results.map(() => null) };
}

describe('rankOptions', () => {
  it('puts the verdict first, then the rest by value, then those that cannot enter', () => {
    const r = row([ok(10), out, ok(30), ok(31)], { kind: 'switch', option: 2 });
    expect(rankOptions(r)).toEqual([2, 3, 0, 1]);
  });

  it('keeps the given order for options of equal value', () => {
    expect(rankOptions(row([ok(5), ok(5), ok(5)], { kind: 'keep', option: 0 }))).toEqual([0, 1, 2]);
  });

  it('ranks by value alone when no option can enter', () => {
    expect(rankOptions(row([out, out], { kind: 'neither' }))).toEqual([0, 1]);
  });
});

describe('listNames', () => {
  it('joins names the way a sentence does', () => {
    expect([listNames(['A']), listNames(['A', 'B']), listNames(['A', 'B', 'C'])]).toEqual(['A', 'A and B', 'A, B and C']);
  });
});

describe('transferSuggestions', () => {
  const names = { a: 'Ivysaur, CP 900', b: 'Ivysaur, CP 800', c: 'Bulbasaur, CP 300' };

  it('suggests every tile that is the top pick for no kind of battle, saying which are better', () => {
    const rows = [row([ok(1), ok(2), ok(3)], { kind: 'switch', option: 1 }), row([ok(1), ok(2), ok(3)], { kind: 'keep', option: 0 })];
    const found = transferSuggestions(rows, ['a', 'b', 'c'], names);
    expect([...found.keys()]).toEqual(['c']);
    expect(found.get('c')).toBe('Not the best for any kind of battle: Ivysaur, CP 900 and Ivysaur, CP 800 do better.');
  });

  it('counts a purified option as its own tile', () => {
    const rows = [row([ok(1), ok(2), ok(3)], { kind: 'switch', option: 1 })];
    const found = transferSuggestions(rows, ['a', 'a', 'b'], names);
    expect(found.get('b')).toBe('Not the best for any kind of battle: Ivysaur, CP 900 does better.');
    expect(found.has('a')).toBe(false);
  });

  it('suggests nothing when no Pokémon can enter any battle', () => {
    expect(transferSuggestions([row([out, out], { kind: 'neither' })], ['a', 'b'], names).size).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { evaluateGoal } from '../../src/core/goals';
import type { PveMove, RaidMoves } from '../../src/core/raid';
import { candidate } from './fixtures';

const move = (id: string, over: Partial<PveMove> = {}): PveMove =>
  ({ id, name: id, type: 'water', power: 10, durationMs: 1000, energy: 10, ...over });

const raidMoves: RaidMoves = {
  types: ['water'],
  fast: [move('SPLASH')],
  charged: [move('TORRENT', { power: 100, durationMs: 2000, energy: 50 })],
};

const raid = (overrides: Parameters<typeof candidate>[0]) => {
  const r = evaluateGoal({ candidate: candidate(overrides), goal: 'raid' });
  if (!r.eligible) throw new Error('expected eligible');
  return r;
};

describe('evaluateGoal: raid damage per second', () => {
  it('values raids by the best pair’s damage per second and names the moves', () => {
    const r = raid({ raidMoves });
    expect(r.basis).toBe('raidDps');
    expect(r.value).toBeGreaterThan(0);
    expect(r.moves).toEqual({ fast: 'SPLASH', charged: 'TORRENT' });
  });

  it('rates higher Attack IVs and a Shadow higher', () => {
    const base = raid({ raidMoves }).value;
    expect(raid({ raidMoves, ivs: { atk: 15, def: 15, hp: 13 } }).value).toBeGreaterThan(base);
    expect(raid({ raidMoves, mods: { variant: 'shadow', lucky: false } }).value).toBeGreaterThan(base);
  });

  it('falls back to Attack when no pair has PvE stats', () => {
    const r = raid({ raidMoves: { ...raidMoves, charged: [] } });
    expect(r.basis).toBe('attack');
    expect(r.moves).toBeUndefined();
  });

  it('leaves league goals on stat product', () => {
    const r = evaluateGoal({ candidate: candidate({ raidMoves }), goal: 'master' });
    expect(r.eligible && r.basis).toBe('statProduct');
  });
});

import { describe, expect, it } from 'vitest';
import type { Combatant } from '../../src/core/damage';
import { bestRaidPair, cycleDps, RAID_DEFENCE, type PveMove, type RaidMoves } from '../../src/core/raid';

const move = (id: string, over: Partial<PveMove> = {}): PveMove =>
  ({ id, name: id, type: 'water', power: 10, durationMs: 1000, energy: 10, ...over });

const splash = move('SPLASH');
const torrent = move('TORRENT', { power: 100, durationMs: 2000, energy: 50 });
const slam = move('SLAM', { type: 'normal', power: 110, durationMs: 2000, energy: 50 });

const attacker: Combatant = { stats: { atk: RAID_DEFENCE, def: 100, hp: 100 }, types: ['water'], variant: 'normal' };

describe('cycleDps', () => {
  it('fills the charged move with fast moves, then fires it', () => {
    // 5 × 7 + 61 damage over 5 × 1 s + 2 s
    expect(cycleDps(attacker, { fast: splash, charged: torrent })).toBeCloseTo(96 / 7);
  });

  it('uses the Shadow attack bonus', () => {
    expect(cycleDps({ ...attacker, variant: 'shadow' }, { fast: splash, charged: torrent })).toBeCloseTo(113 / 7);
  });

  it('is zero when the fast move gives no energy', () => {
    expect(cycleDps(attacker, { fast: move('IDLE', { energy: 0 }), charged: torrent })).toBe(0);
  });
});

describe('bestRaidPair', () => {
  const moves: RaidMoves = { types: ['water'], fast: [splash], charged: [slam, torrent] };

  it('picks the pair with the highest damage per second', () => {
    const best = bestRaidPair(attacker, moves);
    expect(best?.charged.id).toBe('TORRENT');
    expect(best?.dps).toBeCloseTo(96 / 7);
  });

  it('adds the move a Shadow or Purified gets for being one', () => {
    const giga = move('RETURN', { power: 200, durationMs: 2000, energy: 50 });
    const withReturn = { ...moves, variantMoves: { purified: giga } };
    expect(bestRaidPair(attacker, withReturn)?.charged.id).toBe('TORRENT');
    expect(bestRaidPair({ ...attacker, variant: 'purified' }, withReturn)?.charged.id).toBe('RETURN');
  });

  it('gives null when no pair deals damage', () => {
    expect(bestRaidPair(attacker, { ...moves, charged: [] })).toBeNull();
    expect(bestRaidPair(attacker, { ...moves, fast: [move('IDLE', { energy: 0 })] })).toBeNull();
  });
});

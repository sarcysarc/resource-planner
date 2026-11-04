import { describe, expect, it } from 'vitest';
import { MOVES_SCHEMA_VERSION, MovesFileSchema, pveId, toMovesFile } from '../../src/data/moves';

const SOURCES = { pvp: 'https://example.test/pvp.json', pve: 'https://example.test/pve.json' };

const fast = { moveId: 'SPLASHY', name: 'Splashy', type: 'water', power: 3, energy: 0, energyGain: 9, cooldown: 1000, turns: 2 };
const charged = { moveId: 'TORRENT', name: 'Torrent', type: 'water', power: 90, energy: 50, energyGain: 0, cooldown: 500, turns: 1 };

function pvp(moves: unknown[]) {
  return { timestamp: '2026-01-01 00:00:00', pokemon: [], moves };
}

function template(templateId: string, settings: Record<string, unknown>) {
  return { templateId, data: { templateId, moveSettings: { movementId: 1, ...settings } } };
}

const pve = [
  template('V0901_MOVE_SPLASHY_FAST', { power: 10, durationMs: 1000, energyDelta: 12 }),
  template('V0902_MOVE_TORRENT', { power: 110, durationMs: 3000, energyDelta: -50 }),
  { templateId: 'SOMETHING_ELSE', data: { templateId: 'SOMETHING_ELSE' } },
];

describe('toMovesFile', () => {
  it('joins PvP and PvE stats by move id', () => {
    const file = toMovesFile({ pvp: pvp([fast, charged]), pve, sources: SOURCES });
    expect(file).toEqual({
      schemaVersion: MOVES_SCHEMA_VERSION, sources: SOURCES, timestamp: '2026-01-01 00:00:00',
      moves: [
        { id: 'SPLASHY', name: 'Splashy', type: 'water', kind: 'fast',
          pvp: { power: 3, energy: 9, turns: 2 }, pve: { power: 10, durationMs: 1000, energy: 12 } },
        { id: 'TORRENT', name: 'Torrent', type: 'water', kind: 'charged',
          pvp: { power: 90, energy: 50, turns: 1 }, pve: { power: 110, durationMs: 3000, energy: 50 } },
      ],
    });
  });

  it('marks a move with no PvE entry as unknown', () => {
    const plus = { ...charged, moveId: 'TORRENT_PLUS' };
    expect(toMovesFile({ pvp: pvp([plus]), pve, sources: SOURCES }).moves[0]?.pve).toBeNull();
  });

  it('reads missing PvE power and energy as zero', () => {
    const quiet = [template('V0903_MOVE_SPLASHY_FAST', { durationMs: 1000 })];
    expect(toMovesFile({ pvp: pvp([fast]), pve: quiet, sources: SOURCES }).moves[0]?.pve)
      .toEqual({ power: 0, durationMs: 1000, energy: 0 });
  });

  it('rejects sources that are not the expected shape', () => {
    expect(() => toMovesFile({ pvp: { moves: 'none' }, pve, sources: SOURCES })).toThrow();
    expect(() => toMovesFile({ pvp: pvp([fast]), pve: {}, sources: SOURCES })).toThrow();
  });
});

describe('pveId', () => {
  it('drops the template prefix and the fast suffix', () => {
    expect(pveId('V0237_MOVE_BUBBLE_FAST')).toBe('BUBBLE');
    expect(pveId('V0014_MOVE_HYPER_BEAM')).toBe('HYPER_BEAM');
    expect(pveId('V0400_MOVE_WATER_GUN_FAST_BLASTOISE')).toBe('WATER_GUN_FAST_BLASTOISE');
  });

  it('ignores templates that are not moves', () => {
    expect(pveId('VN_BM_001')).toBeNull();
  });

  it('maps every Hidden Power type to the one PvE move', () => {
    expect(toMovesFile({
      pvp: pvp([{ ...fast, moveId: 'HIDDEN_POWER_FIRE', type: 'fire' }]),
      pve: [template('V0281_MOVE_HIDDEN_POWER_FAST', { power: 15, durationMs: 1500, energyDelta: 15 })],
      sources: SOURCES,
    }).moves[0]?.pve).toEqual({ power: 15, durationMs: 1500, energy: 15 });
  });
});

describe('PvE names that differ', () => {
  it('matches moves the PvE source spells differently', () => {
    const file = toMovesFile({
      pvp: pvp([{ ...charged, moveId: 'FUTURE_SIGHT' }, { ...charged, moveId: 'TECHNO_BLAST_DOUSE' }]),
      pve: [
        template('V0275_MOVE_FUTURESIGHT', { power: 120, durationMs: 2700, energyDelta: -100 }),
        template('V0339_MOVE_TECHNO_BLAST_WATER', { power: 120, durationMs: 2000, energyDelta: -50 }),
      ],
      sources: SOURCES,
    });
    expect(file.moves.map((m) => m.pve?.power)).toEqual([120, 120]);
  });
});

describe('MovesFileSchema', () => {
  it('rejects a file from another schema version', () => {
    const file = toMovesFile({ pvp: pvp([fast]), pve, sources: SOURCES });
    expect(MovesFileSchema.safeParse({ ...file, schemaVersion: 0 }).success).toBe(false);
  });
});

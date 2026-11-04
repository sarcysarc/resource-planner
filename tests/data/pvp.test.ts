import { describe, expect, it } from 'vitest';
import { PVP_SCHEMA_VERSION, PvpFileSchema, toPvpFile } from '../../src/data/pvp';

const gamemaster = {
  timestamp: '2026-01-01 00:00:00',
  pokemon: [
    { speciesId: 'tide', defaultIVs: { cp1500: [20.5, 1, 15, 14], cp2500: [40, 5, 14, 15] } },
    { speciesId: 'tide_shadow', defaultIVs: { cp1500: [19, 0, 15, 15] } },
    { speciesId: 'ember' },
  ],
};

const ranking = (...ids: string[]) => ids.map((id, i) => ({ speciesId: id, moveset: [`FAST_${i}`, 'CHARGE'] }));

const input = (great = ranking('tide_shadow', 'tide', 'ember')) => ({
  gamemaster,
  rankings: { great, ultra: ranking('tide'), master: ranking('ember') },
  sources: { gamemaster: 'https://example.test/gm.json', rankings: 'https://example.test/rankings/' },
});

describe('toPvpFile', () => {
  it('keeps each opponent’s fast move, variant and default level and IVs', () => {
    const file = toPvpFile(input());
    expect(file.schemaVersion).toBe(PVP_SCHEMA_VERSION);
    expect(file.timestamp).toBe('2026-01-01 00:00:00');
    expect(file.leagues.great.opponents[0]).toEqual({
      id: 'tide', variant: 'shadow', fast: 'FAST_0', level: 19, ivs: { atk: 0, def: 15, hp: 15 },
    });
    expect(file.leagues.ultra.opponents[0]).toMatchObject({ id: 'tide', level: 40, ivs: { atk: 5, def: 14, hp: 15 } });
  });

  it('uses level 50 and 15/15/15 in Master League', () => {
    expect(toPvpFile(input()).leagues.master.opponents[0]).toMatchObject({ level: 50, ivs: { atk: 15, def: 15, hp: 15 } });
  });

  it('skips opponents with no default IVs for the league', () => {
    expect(toPvpFile(input()).leagues.great.opponents.map((o) => o.id)).toEqual(['tide', 'tide']);
  });

  it('keeps the top 30 opponents and every ranked species’ fast move', () => {
    const many = ranking(...Array.from({ length: 40 }, () => 'tide'));
    const file = toPvpFile(input(many));
    expect(file.leagues.great.opponents).toHaveLength(30);
    expect(toPvpFile(input()).leagues.great.picks).toEqual({ tide_shadow: 'FAST_0', tide: 'FAST_1', ember: 'FAST_2' });
  });

  it('checks its own output', () => {
    expect(PvpFileSchema.parse(toPvpFile(input()))).toBeTruthy();
  });
});

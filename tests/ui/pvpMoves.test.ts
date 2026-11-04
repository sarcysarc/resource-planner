// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { Move } from '../../src/data/moves';
import type { PvpFile } from '../../src/data/pvp';
import { fillPvpPicker, loadPvp, pvpMovesFor } from '../../src/ui/pvpMoves';
import type { MovesIndex } from '../../src/ui/moves';
import type { Species } from '../../src/ui/species';

const move = (id: string, type: string, pvp: Move['pvp']): Move =>
  ({ id, name: id.toLowerCase(), type, kind: 'fast', pvp, pve: null });

const moves: MovesIndex = new Map([
  move('SPLASH', 'water', { power: 3, energy: 9, turns: 1 }),
  move('DRIP', 'water', { power: 5, energy: 6, turns: 2 }),
  move('JAB', 'fighting', { power: 3, energy: 6, turns: 1 }),
].map((m) => [m.id, m]));

const target = { id: 'tide', name: 'Tide', types: ['water'], fast: ['SPLASH', 'DRIP', 'JAB'], charged: [] } as unknown as Species;

const league = (picks: Record<string, string>) => ({ opponents: [], picks });
const data = {
  leagues: { great: league({ tide: 'DRIP', tide_shadow: 'JAB' }), ultra: league({ tide: 'DRIP' }), master: league({}) },
} as unknown as PvpFile;

function side(variant = 'normal'): HTMLElement {
  const root = document.createElement('fieldset');
  root.innerHTML = `<select name="variant"><option value="${variant}"></option></select><select name="pvpFastMove"></select>`;
  fillPvpPicker({ root, target, moves });
  return root;
}

const picker = (root: HTMLElement) => root.querySelector<HTMLSelectElement>('select[name="pvpFastMove"]')!;

describe('fillPvpPicker', () => {
  it('offers PvPoke’s pick and every fast move of the target', () => {
    expect([...picker(side()).options].map((o) => o.text)).toEqual(['PvPoke’s pick', 'splash', 'drip', 'jab']);
  });
});

describe('pvpMovesFor', () => {
  it('uses PvPoke’s pick per league, its Shadow entry for a Shadow', () => {
    expect(pvpMovesFor({ root: side(), target, data, moves })!.fast.great.name).toBe('drip');
    expect(pvpMovesFor({ root: side('shadow'), target, data, moves })!.fast.great.name).toBe('jab');
    expect(pvpMovesFor({ root: side('shadow'), target, data, moves })!.fast.ultra.name).toBe('drip');
  });

  it('falls back to the most damage per turn, with STAB, when unranked', () => {
    // splash 3 × 1.2 per turn beats jab 3 and drip 5 × 1.2 / 2
    expect(pvpMovesFor({ root: side(), target, data, moves })!.fast.master).toEqual({ name: 'splash', power: 3, type: 'water' });
  });

  it('uses a picked move in every league', () => {
    const root = side();
    picker(root).value = 'JAB';
    const fast = pvpMovesFor({ root, target, data, moves })!.fast;
    expect([fast.great.name, fast.ultra.name, fast.master.name]).toEqual(['jab', 'jab', 'jab']);
  });

  it('carries the target’s types', () => {
    expect(pvpMovesFor({ root: side(), target, data, moves })!.types).toEqual(['water']);
  });
});

describe('loadPvp', () => {
  it('loads the bundled file with 30 opponents per league', async () => {
    const file = await loadPvp();
    expect(file.leagues.great.opponents).toHaveLength(30);
  });
});

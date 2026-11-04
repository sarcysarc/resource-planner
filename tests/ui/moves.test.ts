// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { Move } from '../../src/data/moves';
import { fillMovePickers, loadMoves, type MovesIndex, raidMovesFor } from '../../src/ui/moves';
import type { Species } from '../../src/ui/species';

const move = (id: string, kind: Move['kind'], pve: Move['pve'] = { power: 10, durationMs: 1000, energy: 10 }): Move =>
  ({ id, name: id.toLowerCase(), type: 'water', kind, pvp: { power: 1, energy: 1, turns: 1 }, pve });

const moves: MovesIndex = new Map([
  move('SPLASH', 'fast'), move('DRIP', 'fast'), move('TORRENT', 'charged'),
  move('TORRENT_PLUS', 'charged', null), move('FRUSTRATION', 'charged'), move('RETURN', 'charged'),
].map((m) => [m.id, m]));

const target = {
  id: 'tide', name: 'Tide', types: ['water'], fast: ['SPLASH', 'DRIP'], charged: ['TORRENT', 'TORRENT_PLUS'],
} as Species;

function side(): HTMLElement {
  const root = document.createElement('fieldset');
  root.innerHTML = '<select name="fastMove"></select><select name="chargedMove"></select>';
  fillMovePickers({ root, target, moves });
  return root;
}

const select = (root: HTMLElement, name: string) => root.querySelector<HTMLSelectElement>(`select[name="${name}"]`)!;

describe('fillMovePickers', () => {
  it('offers Best and the target’s moves that have raid stats', () => {
    const root = side();
    expect([...select(root, 'fastMove').options].map((o) => o.text)).toEqual(['Best', 'splash', 'drip']);
    expect([...select(root, 'chargedMove').options].map((o) => o.value)).toEqual(['', 'TORRENT']);
  });

  it('keeps a pick that is still offered', () => {
    const root = side();
    select(root, 'fastMove').value = 'DRIP';
    fillMovePickers({ root, target, moves });
    expect(select(root, 'fastMove').value).toBe('DRIP');
  });
});

describe('raidMovesFor', () => {
  it('tries every move with raid stats, plus Frustration and Return by variant', () => {
    const r = raidMovesFor({ root: side(), target, moves });
    expect(r.types).toEqual(['water']);
    expect(r.fast.map((m) => m.id)).toEqual(['SPLASH', 'DRIP']);
    expect(r.charged.map((m) => m.id)).toEqual(['TORRENT']);
    expect(r.variantMoves?.shadow?.id).toBe('FRUSTRATION');
    expect(r.variantMoves?.purified?.id).toBe('RETURN');
  });

  it('uses only the picked move on that side', () => {
    const root = side();
    select(root, 'fastMove').value = 'DRIP';
    select(root, 'chargedMove').value = 'TORRENT';
    const r = raidMovesFor({ root, target, moves });
    expect(r.fast.map((m) => m.id)).toEqual(['DRIP']);
    expect(r.charged.map((m) => m.id)).toEqual(['TORRENT']);
    expect(r.variantMoves).toBeUndefined();
  });
});

describe('loadMoves', () => {
  it('loads the bundled moves file', async () => {
    const all = await loadMoves();
    expect(all.get('BUBBLE')?.pve).not.toBeNull();
  });
});

// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Group } from '../../src/core/screen/merge';
import type { Reading } from '../../src/core/screen/types';
import { buildCandidateFields } from '../../src/ui/candidateFields';
import { createGrid, type Grid } from '../../src/ui/grid';
import { describeTile } from '../../src/ui/tileDescribe';
import { fillTile, trackEdits } from '../../src/ui/tileFill';

let grid: Grid;
const onRead = vi.fn();
const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const group = (reading: Reading): Group => ({ reading, conflicts: [], shots: 1 });
const field = (root: HTMLElement, name: string) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
const use = (reading: Reading) => fillTile({ grid, familyOf: (r) => r.family, onRead }, group(reading));

describe('fillTile', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div data-grid></div><div data-details></div><div data-transfers hidden><ul></ul></div>';
    grid = createGrid({
      parts: { grid: q('[data-grid]'), details: q('[data-details]'), transfer: q('[data-transfers]') },
      prepare: buildCandidateFields,
      describe: describeTile,
    });
    trackEdits(q('[data-details]'));
    onRead.mockClear();
  });

  it('adds a tile per new Pokémon and fills it', () => {
    const a = use({ cp: 900, hp: 100, family: 'dratini', ivs: { atk: 15, def: 14, hp: 13 } });
    const b = use({ cp: 800, hp: 90, family: 'dratini' });
    expect(grid.roots()).toEqual([a, b]);
    expect(field(a, 'cp').value).toBe('900');
    expect(grid.tileOf(a).querySelector('[data-title]')!.textContent).toBe('New Pokémon, CP 900, IVs 15/14/13');
    expect(onRead).toHaveBeenCalledWith(a, expect.objectContaining({ cp: 900 }));
  });

  it('joins a later screenshot to its tile and keeps what the player fixed', () => {
    const a = use({ cp: 900, hp: 100, family: 'dratini' });
    field(a, 'cp').value = '990';
    field(a, 'cp').dispatchEvent(new Event('input', { bubbles: true }));
    expect(use({ cp: 900, hp: 100, family: 'dratini', dust: 4000, secondMove: true, evolveCandy: 25 })).toBe(a);
    expect(grid.roots()).toHaveLength(1);
    expect([field(a, 'cp').value, field(a, 'dust').value, field(a, 'secondMove').checked]).toEqual(['990', '4000', true]);
    expect(a.dataset.known!.split(',').sort()).toEqual(['cp', 'evolveStep', 'lucky', 'secondMove', 'variant']);
  });

  it('adds another tile for one at the same CP and HP with other IVs, and keeps the prints', () => {
    const a = fillTile({ grid, familyOf: (r) => r.family, onRead }, group({ cp: 900, hp: 100, ivs: { atk: 1, def: 2, hp: 3 } }), ['p1']);
    expect([a.dataset.ivs, a.dataset.shots]).toEqual(['1/2/3', 'p1']);
    expect(use({ cp: 900, hp: 100, ivs: { atk: 15, def: 2, hp: 3 } })).not.toBe(a);
    expect(fillTile({ grid, familyOf: (r) => r.family, onRead }, group({ cp: 900, hp: 100 }), ['p2', 'p1'])).toBe(a);
    expect(a.dataset.shots).toBe('p1,p2');
  });

  it('updates the tile of the CP it had before it was powered up', () => {
    const ivs = { atk: 12, def: 3, hp: 14 };
    const a = use({ cp: 2802, hp: 150, family: 'magikarp', ivs });
    const powered = { ...group({ cp: 2950, hp: 160, family: 'magikarp', ivs }), was: 2802 };
    expect(fillTile({ grid, familyOf: (r) => r.family, onRead }, powered)).toBe(a);
    expect([field(a, 'cp').value, a.dataset.cp, a.dataset.hp]).toEqual(['2950', '2950', '160']);
    expect(use({ cp: 2950, hp: 160, family: 'magikarp', ivs })).toBe(a);
  });

  it('joins a screenshot without IVs to the first of two it fits, and notes the other', () => {
    const a = use({ cp: 900, hp: 100, family: 'dratini', ivs: { atk: 1, def: 2, hp: 3 } });
    const b = use({ cp: 900, hp: 100, family: 'dratini', ivs: { atk: 4, def: 5, hp: 6 } });
    expect(use({ cp: 900, hp: 100, family: 'dratini', secondMove: true })).toBe(a);
    expect([a.dataset.alike, b.dataset.alike]).toEqual(['4/5/6', undefined]);
    expect(grid.tileOf(a).querySelector('[data-notes]')!.textContent).toContain('could be the one at 4/5/6');
  });

  it('counts a Shadow label as knowing the type, but not luck', () => {
    const a = use({ cp: 900, variant: 'shadow' });
    expect(a.dataset.known).toBe('variant');
  });
});

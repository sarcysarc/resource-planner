// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { candidate } from '../core/fixtures';
import type { Comparison } from '../../src/core/compare';
import { wirePvp } from '../../src/ui/pvpWiring';
import { findSpecies, loadBundledIndex } from '../../src/ui/species';

const index = loadBundledIndex();

function setup() {
  const target = document.createElement('input');
  const area = document.createElement('div');
  const pvp = wirePvp({ target, area, index });
  // Added after wiring, as a tile added to the grid is.
  const root = document.createElement('fieldset');
  root.dataset.candidate = '';
  root.innerHTML = '<select name="variant"><option value="normal"></option></select><select name="pvpFastMove"></select>';
  area.append(root);
  return { target, root, pvp };
}

const result = { eligible: true, targetLevel: 30, effectiveLevel: 30, cp: 2000, value: 1, basis: 'statProduct',
  cost: { stardust: 0, candy: 0, xl: 0 }, parts: [] } as const;

describe('wirePvp', () => {
  it('has no moves or views before its data loads', () => {
    const { root, pvp } = setup();
    expect(pvp.movesOf(root, findSpecies(index, 'azumarill')!)).toBeUndefined();
    expect(pvp.details([], [])).toEqual({});
  });

  it('fills the picker for the target and gives each side its moves once loaded', async () => {
    const { target, root, pvp } = setup();
    target.value = 'Azumarill';
    await pvp.ready;
    expect(root.querySelector('select[name="pvpFastMove"]')!.querySelectorAll('option').length).toBeGreaterThan(1);
    const moves = pvp.movesOf(root, findSpecies(index, 'azumarill')!);
    expect(moves?.fast.great.name).toBeTruthy();
    const row = { goal: 'great', results: [result], verdict: { kind: 'keep' }, changes: [null] } as unknown as Comparison;
    const details = pvp.details([row], [candidate({ pvpMoves: moves })]);
    expect(details.great?.[0]?.textContent).toContain('against the 30 most-used opponents');
  });
});

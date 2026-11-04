import { describe, expect, it } from 'vitest';
import { buildOptions } from '../../src/ui/options';
import { candidate } from '../core/fixtures';

const shadow = candidate({ mods: { variant: 'shadow', lucky: false } });
const cost = { stardust: 3000, candy: 3 };
const side = (title: string, c = candidate(), purify: typeof cost | null = cost) => ({ candidate: c, purify, formName: 'Marill', title });

describe('buildOptions', () => {
  it('keeps one option per Pokémon when none is Shadow, naming each by its tile', () => {
    const { candidates, labels, notes, owners } = buildOptions([side('Marill, CP 500'), side('Marill, CP 400'), side('Azurill, CP 90')]);
    expect(candidates).toHaveLength(3);
    expect(labels.map((l) => l.heading)).toEqual(['Current: Marill, CP 500', 'Marill, CP 400', 'Azurill, CP 90']);
    expect(labels.map((l) => l.name)).toEqual(['the current one', 'Marill, CP 400', 'Azurill, CP 90']);
    expect(owners).toEqual([0, 1, 2]);
    expect(notes).toEqual([]);
  });

  it('adds a purified option after each Shadow one, owned by the same Pokémon', () => {
    const { candidates, labels, owners } = buildOptions([side('A', shadow), side('B', shadow)]);
    expect(labels.map((l) => l.heading)).toEqual(['Current: A', 'Current, purified', 'B', 'B, purified']);
    expect(labels[3]).toMatchObject({ name: 'the purified B', action: 'switch to B and purify it' });
    expect(candidates.map((c) => c.mods.variant)).toEqual(['shadow', 'purified', 'shadow', 'purified']);
    expect(owners).toEqual([0, 0, 1, 1]);
  });

  it('leaves purifying out with a note when its cost is not known', () => {
    const { labels, notes } = buildOptions([{ ...side('A', shadow, null), formName: 'Smeargle' }, side('B')]);
    expect(labels).toHaveLength(2);
    expect(notes).toEqual(['The purify cost for Smeargle is not known, so purifying it is left out.']);
  });
});

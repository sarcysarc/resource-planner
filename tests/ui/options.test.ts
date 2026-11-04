import { describe, expect, it } from 'vitest';
import { buildOptions } from '../../src/ui/options';
import { candidate } from '../core/fixtures';

const shadow = candidate({ mods: { variant: 'shadow', lucky: false } });
const cost = { stardust: 3000, candy: 3 };

describe('buildOptions', () => {
  it('keeps two options when neither is Shadow', () => {
    const { candidates, labels, notes } = buildOptions([
      { candidate: candidate(), purify: cost, formName: 'Marill' },
      { candidate: candidate(), purify: cost, formName: 'Marill' },
    ]);
    expect(candidates).toHaveLength(2);
    expect(labels.map((l) => l.heading)).toEqual(['Current', 'Alternative']);
    expect(notes).toEqual([]);
  });

  it('adds a purified option after each Shadow one', () => {
    const { candidates, labels } = buildOptions([
      { candidate: shadow, purify: cost, formName: 'Marill' },
      { candidate: shadow, purify: cost, formName: 'Marill' },
    ]);
    expect(labels.map((l) => l.heading)).toEqual(['Current', 'Current, purified', 'Alternative', 'Alternative, purified']);
    expect(candidates.map((c) => c.mods.variant)).toEqual(['shadow', 'purified', 'shadow', 'purified']);
  });

  it('leaves purifying out with a note when its cost is not known', () => {
    const { labels, notes } = buildOptions([
      { candidate: shadow, purify: null, formName: 'Smeargle' },
      { candidate: candidate(), purify: cost, formName: 'Marill' },
    ]);
    expect(labels).toHaveLength(2);
    expect(notes).toEqual(['The purify cost for Smeargle is not known, so purifying it is left out.']);
  });
});

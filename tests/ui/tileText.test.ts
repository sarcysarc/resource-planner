import { describe, expect, it } from 'vitest';
import { tileNotes, tileTitle } from '../../src/ui/tileText';

describe('tileTitle', () => {
  it('names a Pokémon by name, CP and IVs', () => {
    expect(tileTitle({ name: 'Ivysaur', cp: '900', level: '', ivs: ['15', '14', '13'] })).toBe('Ivysaur, CP 900, IVs 15/14/13');
  });

  it('falls back to the level, and says when the IVs are not known', () => {
    expect(tileTitle({ name: 'Ivysaur', cp: '', level: '20', ivs: ['', '14', '13'] })).toBe('Ivysaur, level 20, IVs not known');
  });

  it('leaves out what is not there at all', () => {
    expect(tileTitle({ name: '', cp: '', level: '', ivs: ['', '', ''] })).toBe('New Pokémon, IVs not known');
  });
});

describe('tileNotes', () => {
  const all = new Set(['variant', 'lucky', 'secondMove']);

  it('says nothing when everything is known', () => {
    expect(tileNotes({ ivs: true, needsEvolve: false, known: all })).toEqual([]);
  });

  it('says when a screenshot without IVs could be another tile', () => {
    expect(tileNotes({ ivs: true, needsEvolve: false, known: all, alike: '4/5/6' })).toEqual([
      'A screenshot without IVs went to this one, but could be the one at 4/5/6.',
    ]);
  });

  it('names only the traits still guessed', () => {
    const notes = (known: string[]) => tileNotes({ ivs: true, needsEvolve: false, known: new Set([...known, 'secondMove']) });
    expect(notes(['lucky'])).toEqual(['Taken as not Shadow or Purified. Add its Pokémon screen to check.']);
    expect(notes(['variant'])).toEqual(['Taken as not Lucky. Add its Pokémon screen to check.']);
    expect(notes(['variant', 'lucky'])).toEqual([]);
  });

  it('names the screenshot that fills each gap', () => {
    expect(tileNotes({ ivs: false, needsEvolve: true, known: new Set() })).toEqual([
      'Add its appraisal for the IVs.',
      'Taken as not Shadow, Purified or Lucky. Add its Pokémon screen to check.',
      'Add its screen scrolled down, together with its top screen, for the Candy to evolve and the second move (taken as locked).',
    ]);
  });

  it('asks only for the scrolled-down screen when only the evolve Candy is missing', () => {
    expect(tileNotes({ ivs: true, needsEvolve: true, known: all })).toEqual(['Add its screen scrolled down, together with its top screen, for the Candy to evolve.']);
  });

  it('asks for the next form when its own evolve Candy was read', () => {
    expect(tileNotes({ ivs: true, needsEvolve: true, known: all, later: 'Lairon' })).toEqual([
      'Add a Lairon’s screen scrolled down for the Candy to evolve it, or type the total.',
    ]);
  });
});

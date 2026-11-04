import type { Species, SpeciesIndex } from './species';

/** A string to paste into the in-game Pokémon search, and what it finds. */
export interface Suggestion {
  text: string;
  purpose: string;
}

// Each term was checked in the game (docs/screens.md, "Search strings").
const NARROWER: Suggestion[] = [
  { text: '&cp-1500', purpose: '1,500 CP or less: can still enter Great League.' },
  { text: '&cp-2500', purpose: '2,500 CP or less: can still enter Ultra League.' },
  { text: '&3*-', purpose: 'Appraised 3 or 4 stars: high stats, for Master League and raids.' },
  { text: '&!@3move', purpose: 'Second charged move already unlocked: saves that cost.' },
  { text: '&shadow,purified', purpose: 'Shadow and purified ones: they cost more or less to power up.' },
];

// The game shows these as ♀ and ♂, which are hard to type.
const GENDERED = / (Female|Male)$/;

const plainName = (s: Species) => s.name.replace(/ \(.*\)$/, '').toLowerCase();

/**
 * The name to put after "+": any member finds the whole family, so a member that is
 * easy to type is enough. Forms are dropped because the search cannot tell them apart.
 */
export function searchName(index: SpeciesIndex, target: Species): string {
  if (!GENDERED.test(target.name)) return plainName(target);
  const next = index.all.find((s) => s.parent === target.id);
  return next ? plainName(next) : plainName(target).replace(GENDERED, '');
}

export function suggestSearches(name: string): Suggestion[] {
  const family = `+${name}`;
  return [
    { text: family, purpose: 'The whole family, every stage. Screenshot the ones you might use.' },
    ...NARROWER.map((s) => ({ text: family + s.text, purpose: s.purpose })),
  ];
}

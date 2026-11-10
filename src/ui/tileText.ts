// What a tile in the grid says about its Pokémon (ADR 0015): a name the player can match
// to the game, and which screenshot would fill each gap.
import { listNames } from './ranking';

export interface TileFacts {
  /** The form's name, '' when not known yet. */
  name: string;
  cp: string;
  level: string;
  ivs: readonly [string, string, string];
}

/** E.g. "Ivysaur, CP 900, IVs 15/14/13". */
export function tileTitle({ name, cp, level, ivs }: TileFacts): string {
  const parts = [name || 'New Pokémon'];
  if (cp) parts.push(`CP ${cp}`);
  else if (level) parts.push(`level ${level}`);
  parts.push(ivs.every((v) => v !== '') ? `IVs ${ivs.join('/')}` : 'IVs not known');
  return parts.join(', ');
}

export interface TileGaps {
  /** Whether all three IVs are filled in. */
  ivs: boolean;
  /** Whether it still has to evolve and its Candy to evolve is blank. */
  needsEvolve: boolean;
  /** The fields read from a screenshot or set by the player, not left at their defaults. */
  known: ReadonlySet<string>;
  /** The next form, when its own step's Candy was read, so a later step's is missing. */
  later?: string;
  /** The IVs of another tile a screenshot without IVs could also have been (ADR 0017). */
  alike?: string;
}

function scrolledDown({ needsEvolve, known, later }: TileGaps): string | undefined {
  const parts = [];
  if (needsEvolve && !later) parts.push('the Candy to evolve');
  if (!known.has('secondMove')) parts.push('the second move (taken as locked)');
  return parts.length ? `Add its screen scrolled down, together with its top screen, for ${listNames(parts)}.` : undefined;
}

// An appraisal shows the Lucky label and the Shadow sky (issue #13), but not Purified, so
// that can still be a guess; the screen scrolled down shows it.
function guesses(known: ReadonlySet<string>): string | undefined {
  const variant = known.has('variant');
  const parts = [variant || known.has('shadow') ? '' : 'Shadow', variant ? '' : 'Purified', known.has('lucky') ? '' : 'Lucky'];
  const taken = parts.filter(Boolean);
  if (!taken.length) return undefined;
  const screen = known.has('shadow') ? 'its screen scrolled down' : 'its Pokémon screen';
  return `Taken as not ${listOr(taken)}. Add ${screen} to check.`;
}

const listOr = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0]);

/** One sentence per gap, each naming the screenshot that would fill it. */
export function tileNotes(gaps: TileGaps): string[] {
  const notes = [];
  if (!gaps.ivs) notes.push('Add its appraisal for the IVs.');
  const guessed = guesses(gaps.known);
  if (guessed) notes.push(guessed);
  if (gaps.needsEvolve && gaps.later) notes.push(`Add a ${gaps.later}’s screen scrolled down for the Candy to evolve it, or type the total.`);
  const scrolled = scrolledDown(gaps);
  if (scrolled) notes.push(scrolled);
  if (gaps.alike) notes.push(`A screenshot without IVs went to this one, but could be the one at ${gaps.alike}.`);
  return notes;
}

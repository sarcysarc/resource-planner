// A Pokémon already added, read again at another CP (ADR 0017): same line and IVs, so it
// may be the same one powered up or evolved since. Step 1 asks once; a yes updates its tile.
import type { FamilyOf, Group } from '../core/screen/merge';
import type { Question } from './questions';
import { ivsText } from './tileMatch';

/** A tile already in a line, as it was read. */
export interface KnownTile {
  family: string;
  /** As "atk/def/hp". */
  ivs: string;
  cp: number;
  name?: string;
}

// The tile it may be: same line and IVs, another CP, and no tile at this CP to join instead.
function earlier({ reading }: Group, known: readonly KnownTile[], familyOf: FamilyOf): KnownTile | undefined {
  const ivs = ivsText(reading.ivs);
  const family = familyOf(reading);
  if (!ivs || !family || reading.cp === undefined) return undefined;
  const same = known.filter((t) => t.family === family && t.ivs === ivs);
  return same.some((t) => t.cp === reading.cp) ? undefined : same[0];
}

function ask(group: Group, at: number, tile: KnownTile): Question {
  const { name, cp, ivs } = group.reading;
  const was = tile.name ?? name;
  const how = was === name ? 'powered up' : 'evolved';
  return {
    group: at,
    field: 'was',
    text: `Is ${name} CP ${cp} (${ivsText(ivs)}) your ${was} CP ${tile.cp}, ${how}?`,
    choices: [
      { label: 'Yes, the same one', value: JSON.stringify(tile.cp) },
      { label: 'No, another one', value: 'null' },
    ],
  };
}

/** A question for each Pokémon that may be one already added, at its CP from before. */
export function poweredQuestions(groups: readonly Group[], known: readonly KnownTile[], familyOf: FamilyOf): Question[] {
  return groups.flatMap((group, at) => {
    const tile = earlier(group, known, familyOf);
    return tile ? [ask(group, at, tile)] : [];
  });
}

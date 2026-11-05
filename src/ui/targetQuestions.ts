// Step 1 asks which final evolution a branching line battles with (ADR 0017), once per
// line, about the first Pokémon read in it; the answer becomes the line's target.
import type { FamilyOf, Group } from '../core/screen/merge';
import type { Reading } from '../core/screen/types';
import type { Question } from './questions';

/** The finals to choose between for a line from the Pokémon read in it; none to not ask. */
export type ChoicesOf = (family: string, readings: Reading[]) => string[];

const listed = (names: string[]) => `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`;

function ask(group: Group, at: number, names: string[]): Question {
  const text = `Which will you battle with from ${group.reading.name ?? 'this'}’s line: ${listed(names)}?`;
  return { group: at, field: 'target', text, choices: names.map((n) => ({ label: n, value: JSON.stringify(n) })) };
}

/** A question for each line read whose target can't be told. */
export function targetQuestions(groups: readonly Group[], familyOf: FamilyOf, choicesOf: ChoicesOf): Question[] {
  const families = [...new Set(groups.map((g) => familyOf(g.reading)))].filter((f) => f !== undefined);
  return families.flatMap((family) => {
    const at = groups.findIndex((g) => familyOf(g.reading) === family);
    const names = choicesOf(family, groups.filter((g) => familyOf(g.reading) === family).map((g) => g.reading));
    return names.length ? [ask(groups[at], at, names)] : [];
  });
}

// What step 1 asks before the grid (ADR 0015): which stage a Pokémon is when its
// screenshots can't tell, and which value is right when screenshots disagree.
import type { Conflict, Group } from '../core/screen/merge';
import type { Reading } from '../core/screen/types';
import { CONFLICT_NAMES, formatValue } from './conflicts';

export interface Question {
  /** Which group it is about. */
  group: number;
  /** `was`: whether it is a Pokémon already added, at another CP (see poweredUp). */
  field: Conflict['field'] | 'was';
  text: string;
  /** Each value is JSON, so any reading value fits in a select. */
  choices: { label: string; value: string }[];
}

/** The species a reading could be. */
export type StagesOf = (reading: Reading) => readonly { name: string }[];

function groupName({ reading }: Group, at: number): string {
  const shown = [reading.name, reading.cp === undefined ? undefined : `CP ${reading.cp}`].filter(Boolean);
  return `Pokémon ${at + 1}${shown.length ? ` (${shown.join(', ')})` : ''}`;
}

function stageQuestion(group: Group, at: number, stagesOf: StagesOf): Question[] {
  const stages = stagesOf(group.reading);
  if (stages.length < 2) return [];
  const choices = stages.map(({ name }) => ({ label: name, value: JSON.stringify(name) }));
  return [{ group: at, field: 'name', text: `${groupName(group, at)}: which one is it?`, choices }];
}

function conflictQuestion(group: Group, at: number, { field, values }: Conflict): Question {
  const text = `${groupName(group, at)}: the screenshots disagree on ${CONFLICT_NAMES[field]}. Which is right?`;
  const choices = values.map((v) => ({ label: formatValue(field, v), value: JSON.stringify(v) }));
  return { group: at, field, text, choices };
}

/** Every question about these Pokémon, in order. */
export function questionsFor(groups: readonly Group[], stagesOf: StagesOf): Question[] {
  return groups.flatMap((group, at) => [
    ...stageQuestion(group, at, stagesOf),
    ...group.conflicts.map((conflict) => conflictQuestion(group, at, conflict)),
  ]);
}

/** The groups with each answer applied. The groups given are left as they were. */
export function answer(groups: readonly Group[], answers: readonly [Question, string][]): Group[] {
  const settled = groups.map((g) => ({ ...g, reading: { ...g.reading }, conflicts: [...g.conflicts] }));
  for (const [q, value] of answers) apply(settled[q.group], q.field, JSON.parse(value) as unknown);
  return settled;
}

function apply(group: Group, field: Question['field'], value: unknown): void {
  if (field === 'was') {
    group.was = typeof value === 'number' ? value : undefined;
    return;
  }
  Object.assign(group.reading, { [field]: value });
  group.conflicts = group.conflicts.filter((c) => c.field !== field);
}

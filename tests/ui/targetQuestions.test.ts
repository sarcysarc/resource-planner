import { describe, expect, it } from 'vitest';
import type { Group } from '../../src/core/screen/merge';
import type { Reading } from '../../src/core/screen/types';
import { answer } from '../../src/ui/questions';
import { targetQuestions } from '../../src/ui/targetQuestions';

const group = (name: string): Group => ({ reading: { name }, conflicts: [], shots: 1 });
const familyOf = (r: Reading) => (r.name === 'Lairon' ? 'ARON' : 'ODDISH');
const choicesOf = (family: string, readings: Reading[]) =>
  family === 'ODDISH' && readings.length === 2 ? ['Vileplume', 'Bellossom'] : [];

describe('targetQuestions', () => {
  it('asks once per branching line, about its first Pokémon read', () => {
    const groups = [group('Lairon'), group('Gloom'), group('Oddish')];
    expect(targetQuestions(groups, familyOf, choicesOf)).toEqual([
      {
        group: 1,
        field: 'target',
        text: 'Which will you battle with from Gloom’s line: Vileplume or Bellossom?',
        choices: [
          { label: 'Vileplume', value: '"Vileplume"' },
          { label: 'Bellossom', value: '"Bellossom"' },
        ],
      },
    ]);
  });

  it('keeps the answer on that Pokémon', () => {
    const groups = [group('Gloom'), group('Oddish')];
    const [q] = targetQuestions(groups, familyOf, choicesOf);
    expect(answer(groups, [[q, '"Bellossom"']])[0].target).toBe('Bellossom');
  });
});

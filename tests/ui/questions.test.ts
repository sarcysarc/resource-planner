import { describe, expect, it } from 'vitest';
import type { Group } from '../../src/core/screen/merge';
import type { Reading } from '../../src/core/screen/types';
import { answer, questionsFor } from '../../src/ui/questions';

const group = (reading: Reading, conflicts: Group['conflicts'] = []): Group => ({ reading, conflicts, shots: 1 });
const stages = (r: Reading) => (r.name ? [{ name: r.name }] : r.family === 'ODDISH' ? [{ name: 'Gloom' }, { name: 'Vileplume' }] : []);

describe('questionsFor', () => {
  it('asks which stage a Pokémon is when its family has several that fit', () => {
    const [q] = questionsFor([group({ family: 'ODDISH', cp: 600 })], stages);
    expect(q).toEqual({
      group: 0,
      field: 'name',
      text: 'Pokémon 1 (CP 600): which one is it?',
      choices: [{ label: 'Gloom', value: '"Gloom"' }, { label: 'Vileplume', value: '"Vileplume"' }],
    });
  });

  it('asks which value is right when screenshots disagree', () => {
    const conflicts = [{ field: 'ivs' as const, values: [{ atk: 1, def: 2, hp: 3 }, { atk: 1, def: 2, hp: 4 }] }];
    const [q] = questionsFor([group({ name: 'Gloom' }), group({ name: 'Oddish', cp: 90 }, conflicts)], stages);
    expect(q.text).toBe('Pokémon 2 (Oddish, CP 90): the screenshots disagree on IVs. Which is right?');
    expect(q.choices.map((c) => c.label)).toEqual(['1/2/3', '1/2/4']);
  });

  it('asks nothing when everything is settled', () => {
    expect(questionsFor([group({ name: 'Gloom', cp: 600 })], stages)).toEqual([]);
  });
});

describe('answer', () => {
  it('sets the chosen value and drops the conflict', () => {
    const conflicts = [{ field: 'cp' as const, values: [600, 610] }];
    const groups = [group({ name: 'Gloom' }, conflicts)];
    const [q] = questionsFor(groups, stages);
    const [settled] = answer(groups, [[q, '610']]);
    expect(settled.reading.cp).toBe(610);
    expect(settled.conflicts).toEqual([]);
    expect(groups[0].reading.cp).toBeUndefined();
  });
});

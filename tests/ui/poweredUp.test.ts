import { describe, expect, it } from 'vitest';
import type { Group } from '../../src/core/screen/merge';
import type { Reading } from '../../src/core/screen/types';
import { poweredQuestions, type KnownTile } from '../../src/ui/poweredUp';
import { answer } from '../../src/ui/questions';

const group = (reading: Reading): Group => ({ reading, conflicts: [], shots: 1 });
const familyOf = (r: Reading) => (r.name === 'Magikarp' || r.name === 'Gyarados' ? 'MAGIKARP' : undefined);
const ivs = { atk: 12, def: 3, hp: 14 };
const gyarados: KnownTile = { family: 'MAGIKARP', ivs: '12/3/14', cp: 2802, name: 'Gyarados' };

describe('poweredQuestions', () => {
  it('asks once whether a Pokémon at another CP is the one already added, powered up', () => {
    const [q, ...rest] = poweredQuestions([group({ name: 'Gyarados', cp: 2950, ivs })], [gyarados], familyOf);
    expect(rest).toEqual([]);
    expect(q).toEqual({
      group: 0,
      field: 'was',
      text: 'Is Gyarados CP 2950 (12/3/14) your Gyarados CP 2802, powered up?',
      choices: [
        { label: 'Yes, the same one', value: '2802' },
        { label: 'No, another one', value: 'null' },
      ],
    });
  });

  it('asks whether it evolved when the one added was an earlier stage', () => {
    const magikarp = { ...gyarados, cp: 300, name: 'Magikarp' };
    const [q] = poweredQuestions([group({ name: 'Gyarados', cp: 2950, ivs })], [magikarp], familyOf);
    expect(q.text).toBe('Is Gyarados CP 2950 (12/3/14) your Magikarp CP 300, evolved?');
  });

  it('asks nothing when the CP is the same, the IVs differ or are unknown, or the line differs', () => {
    const groups = [
      group({ name: 'Gyarados', cp: 2802, ivs }),
      group({ name: 'Gyarados', cp: 2950, ivs: { ...ivs, hp: 15 } }),
      group({ name: 'Gyarados', cp: 2950 }),
      group({ name: 'Pidgey', cp: 2950, ivs }),
    ];
    expect(poweredQuestions(groups, [gyarados], familyOf)).toEqual([]);
  });

  it('asks nothing when a tile already has this CP', () => {
    const same = { ...gyarados, cp: 2950 };
    expect(poweredQuestions([group({ name: 'Gyarados', cp: 2950, ivs })], [gyarados, same], familyOf)).toEqual([]);
  });

  it('names the one added by the new name when it has none', () => {
    const [q] = poweredQuestions([group({ name: 'Gyarados', cp: 2950, ivs })], [{ ...gyarados, name: undefined }], familyOf);
    expect(q.text).toBe('Is Gyarados CP 2950 (12/3/14) your Gyarados CP 2802, powered up?');
  });
});

describe('answering whether it was powered up', () => {
  const groups = [group({ name: 'Gyarados', cp: 2950, ivs })];
  const [q] = poweredQuestions(groups, [gyarados], familyOf);

  it('keeps the old CP on a yes, to find its tile', () => {
    expect(answer(groups, [[q, '2802']])[0].was).toBe(2802);
  });

  it('leaves it a new Pokémon on a no', () => {
    const [settled] = answer(groups, [[q, 'null']]);
    expect([settled.was, settled.reading.cp]).toEqual([undefined, 2950]);
  });
});

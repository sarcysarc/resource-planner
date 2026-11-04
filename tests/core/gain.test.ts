import { describe, expect, it } from 'vitest';
import { bestGain } from '../../src/core/gain';
import type { GoalId } from '../../src/core/goals';

const row = (goal: GoalId, changes: (number | null)[]) => ({ goal, changes });

describe('bestGain', () => {
  it('takes the option that beats the current one by the most, in any battle', () => {
    const rows = [row('great', [0, 0.05]), row('raid', [0, 0.2, 0.1])];
    expect(bestGain(rows)).toEqual({ goal: 'raid', option: 1, change: 0.2 });
  });

  it('gives nothing when no option beats the current one', () => {
    expect(bestGain([row('great', [0, -0.1, null]), row('master', [null, null])])).toBeUndefined();
  });

  it('prefers raids, then Master, Ultra and Great League on a tie', () => {
    expect(bestGain([row('great', [0, 0.1]), row('master', [0, 0.1])])?.goal).toBe('master');
    expect(bestGain([row('ultra', [0, 0.1]), row('raid', [0, 0.1])])?.goal).toBe('raid');
  });
});

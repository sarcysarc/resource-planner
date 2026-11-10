import { describe, expect, it } from 'vitest';
import { bestGain } from '../../src/core/gain';
import type { GoalId } from '../../src/core/goals';
import type { Verdict } from '../../src/core/verdict';

const pick = (option: number): Verdict => ({ kind: 'switch', option });
const KEEP: Verdict = { kind: 'keep', option: 0 };
const row = (goal: GoalId, changes: (number | null)[], verdict: Verdict) => ({ goal, changes, verdict });

describe('bestGain', () => {
  it('takes the switch that beats the current one by the most, in any battle', () => {
    const rows = [row('great', [0, 0.05], pick(1)), row('raid', [0, 0.2, 0.1], pick(1))];
    expect(bestGain(rows)).toEqual({ goal: 'raid', option: 1, change: 0.2 });
  });

  it('gives nothing when every verdict keeps the current one', () => {
    expect(bestGain([row('great', [0, -0.1, null], KEEP), row('master', [null, null], { kind: 'neither' })])).toBeUndefined();
  });

  // Issue #12: a gain within the 1% tie that costs more is a keep, not a call.
  it('passes over a gain the verdict keeps the current one against', () => {
    expect(bestGain([row('great', [0, 0.006], KEEP)])).toBeUndefined();
  });

  // Issue #12: a switch to one as strong but cheaper is still a call.
  it('takes the verdict’s pick when it is no stronger, and one the current can’t match', () => {
    expect(bestGain([row('great', [0, 0.02, -0.003], pick(2))])).toEqual({ goal: 'great', option: 2, change: -0.003 });
    expect(bestGain([row('ultra', [null, null], { kind: 'save', option: 1 })])).toEqual({ goal: 'ultra', option: 1, change: null });
  });

  it('prefers a bigger gain, then raids, Master, Ultra and Great League on a tie', () => {
    expect(bestGain([row('great', [0, 0.1], pick(1)), row('master', [0, 0.1], pick(1))])?.goal).toBe('master');
    expect(bestGain([row('ultra', [0, 0.1], pick(1)), row('raid', [0, 0.1], pick(1))])?.goal).toBe('raid');
    expect(bestGain([row('raid', [null, null], pick(1)), row('great', [0, 0.03], pick(1))])?.goal).toBe('great');
  });
});

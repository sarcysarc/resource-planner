// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { GoalId } from '../../src/core/goals';
import { callOf, MORE, reasonOf } from '../../src/ui/lineCall';

const labels = [
  { heading: 'Current: Magikarp, CP 100', name: 'the current one' },
  { heading: 'Current, purified', name: 'the purified current one' },
  { heading: 'Gyarados, CP 2802', name: 'Gyarados, CP 2802' },
];
const row = (goal: GoalId, changes: (number | null)[], option = 0) => ({ goal, changes, verdict: { kind: option ? ('switch' as const) : ('keep' as const), option } });

function tile(ivs: string[]): HTMLElement {
  const root = document.createElement('fieldset');
  root.innerHTML = ['atk', 'def', 'hp'].map((n, i) => `<input name="${n}" value="${ivs[i]}" />`).join('');
  return root;
}

describe('a line’s call', () => {
  it('names the option with the biggest gain, how much and in which battle', () => {
    const call = callOf(labels, [row('great', [0, 0.05, 0.01], 1), row('raid', [0, 0, 0.2], 2)]);
    expect(call).toEqual({ text: 'Gyarados, CP 2802: 20% stronger in Raids & gyms', gain: 0.2 });
  });

  // Issue #12: the verdict picks one within the 1% tie only when it costs less.
  it('says one within 1% is as strong for less, not 1% stronger', () => {
    expect(callOf(labels, [row('great', [0, 0.006], 1)])).toEqual({ text: 'Current, purified: as strong in Great League, for less', gain: 0.006 });
    expect(callOf(labels, [row('great', [0, -0.004], 1)])).toEqual({ text: 'Current, purified: as strong in Great League, for less', gain: 0 });
  });

  it('says one can enter a battle the current one can’t', () => {
    expect(callOf(labels, [row('great', [null, null, null], 2)])).toEqual({ text: 'Gyarados, CP 2802: can enter Great League', gain: 0 });
  });

  it('says the current one is best when nothing beats it', () => {
    expect(callOf(labels, [row('great', [0, 0.3])])).toEqual({ text: 'the current one is best', gain: 0 });
  });
});

describe('why a line has no call', () => {
  it('asks for another Pokémon when there is one', () => {
    expect(reasonOf(MORE, [tile(['1', '2', '3'])])).toBe('add another to compare');
  });

  it('says IVs are needed when a Pokémon has none', () => {
    expect(reasonOf('Lairon: Enter IVs', [tile(['1', '2', '3']), tile(['', '', ''])])).toBe('needs IVs');
  });

  it('says the Candy to evolve is needed when it is', () => {
    const error = 'Aron: Candy to evolve: type the total from Aron to Aggron, or add a screenshot of each stage';
    expect(reasonOf(error, [tile(['1', '2', '3']), tile(['4', '5', '6'])])).toBe('needs Candy to evolve');
  });

  // Issue #10: "needs details" didn't say which, so the row names the Pokémon and the problem.
  it('names the Pokémon and its problem when one Pokémon’s details are wrong', () => {
    const title = 'Meowth, CP 437, IVs 14/10/14';
    const reason = reasonOf(`${title}: No level gives CP 437 with those IVs`, [tile(['1', '2', '3']), tile(['14', '10', '14'])], title);
    expect(reason).toBe('check Meowth, CP 437, IVs 14/10/14: no level gives CP 437 with those IVs');
  });

  it('says other details are needed otherwise', () => {
    expect(reasonOf('Resources: Trainer level', [tile(['1', '2', '3']), tile(['4', '5', '6'])])).toBe('needs details');
  });
});

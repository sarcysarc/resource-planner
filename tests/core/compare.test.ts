import { describe, expect, it } from 'vitest';
import { compare } from '../../src/core/compare';
import { candidate } from './fixtures';

const rich = { stardust: 1e9, candy: 1e6, xl: 1e6 };

describe('compare', () => {
  it('returns one comparison per goal, with a result per option', () => {
    const rows = compare({ candidates: [candidate({ ivs: { atk: 15, def: 15, hp: 15 } }), candidate()], resources: rich });
    expect(rows.map((r) => r.goal)).toEqual(['great', 'ultra', 'master', 'raid']);
    expect(rows[0].results).toHaveLength(2);
    expect(rows[0].verdict).toEqual({ kind: 'switch', option: 1 });
    expect(rows[3].verdict.kind).toBe('keep');
  });

  it('gives each option its value change against the current one', () => {
    const rows = compare({ candidates: [candidate({ ivs: { atk: 15, def: 15, hp: 15 } }), candidate(), candidate()], resources: rich });
    const [, alt, third] = rows[0].changes;
    expect(rows[0].changes[0]).toBe(0);
    expect(alt).toBeGreaterThan(0);
    expect(third).toBe(alt);
  });

  it('reports no value change for an ineligible option or against an ineligible current one', () => {
    const over = candidate({ ivs: { atk: 15, def: 15, hp: 15 }, level: 45 });
    expect(compare({ candidates: [over, candidate()], resources: rich })[0].changes).toEqual([null, null]);
    expect(compare({ candidates: [candidate(), over], resources: rich })[0].changes).toEqual([0, null]);
  });
});

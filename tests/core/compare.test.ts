import { describe, expect, it } from 'vitest';
import { compare } from '../../src/core/compare';
import { candidate } from './fixtures';

describe('compare', () => {
  it('returns one comparison per goal', () => {
    const rows = compare({
      current: candidate({ ivs: { atk: 15, def: 15, hp: 15 } }),
      alternative: candidate(),
      resources: { stardust: 1e9, candy: 1e6, xl: 1e6 },
    });
    expect(rows.map((r) => r.goal)).toEqual(['great', 'ultra', 'master', 'raid']);
    expect(rows[0].verdict).toBe('switch');
    expect(rows[3].verdict).toBe('keep');
    expect(rows[0].valueChange).toBeGreaterThan(0);
  });

  it('reports no value change when either side is ineligible', () => {
    const rows = compare({
      current: candidate({ ivs: { atk: 15, def: 15, hp: 15 }, level: 45 }),
      alternative: candidate(),
      resources: { stardust: 0, candy: 0, xl: 0 },
    });
    expect(rows[0].valueChange).toBeNull();
  });
});

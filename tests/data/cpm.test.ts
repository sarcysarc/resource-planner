import { describe, expect, it } from 'vitest';
import { cpmAt, MAX_LEVEL } from '../../src/data/cpm';

describe('cpmAt', () => {
  it('returns known multipliers', () => {
    expect(cpmAt(1)).toBeCloseTo(0.094, 4);
    expect(cpmAt(40)).toBeCloseTo(0.7903, 4);
    expect(cpmAt(50)).toBeCloseTo(0.8403, 4);
    expect(cpmAt(51)).toBeCloseTo(0.8453, 4);
  });

  it('supports half levels', () => {
    expect(cpmAt(39.5)).toBeCloseTo(0.7875, 4);
  });

  it('rejects levels that are not half steps in range', () => {
    expect(() => cpmAt(0.5)).toThrow();
    expect(() => cpmAt(10.25)).toThrow();
    expect(() => cpmAt(MAX_LEVEL + 0.5)).toThrow();
  });
});

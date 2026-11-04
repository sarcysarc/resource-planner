import { describe, expect, it } from 'vitest';
import { effectiveness, TYPES } from '../../src/data/types';

describe('effectiveness', () => {
  it('lists the 18 types', () => {
    expect(TYPES).toHaveLength(18);
  });

  it('is neutral when no rule applies', () => {
    expect(effectiveness('normal', ['water'])).toBe(1);
  });

  it('gives 1.6 for a weakness and 0.625 for a resistance', () => {
    expect(effectiveness('water', ['fire'])).toBe(1.6);
    expect(effectiveness('fire', ['water'])).toBe(0.625);
  });

  it('gives 0.390625 for an immunity', () => {
    expect(effectiveness('ghost', ['normal'])).toBe(0.390625);
    expect(effectiveness('ground', ['flying'])).toBe(0.390625);
  });

  it('multiplies across both defending types', () => {
    expect(effectiveness('ice', ['grass', 'ground'])).toBeCloseTo(2.56);
    expect(effectiveness('fighting', ['ghost', 'psychic'])).toBeCloseTo(0.244140625);
    expect(effectiveness('fire', ['grass', 'water'])).toBe(1);
  });

  it('treats an unknown type as neutral', () => {
    expect(effectiveness('shadow', ['fire'])).toBe(1);
    expect(effectiveness('fire', ['none'])).toBe(1);
  });
});

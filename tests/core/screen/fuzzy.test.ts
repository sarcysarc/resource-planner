import { describe, expect, it } from 'vitest';
import { distance, isNear } from '../../../src/core/screen/fuzzy';

describe('fuzzy labels', () => {
  it('counts the edits between two words', () => {
    expect([distance('CANDY', 'CANDY'), distance('CANLY', 'CANDY'), distance('TARDUST', 'STARDUST'), distance('', 'XL')]).toEqual([0, 1, 1, 2]);
  });

  it('allows one wrong letter in four of the label', () => {
    expect([isNear('CANLY', 'CANDY'), isNear('CANUY', 'CANDY'), isNear('SEARLUST', 'STARDUST')]).toEqual([true, true, true]);
    expect([isNear('CAMERA', 'CANDY'), isNear('XX', 'XL')]).toEqual([false, false]);
  });
});

import { describe, expect, it } from 'vitest';
import { cpOptions } from '../../../src/core/screen/cpBand';

// Band texts as OCR read them on the 2026-11-04 stress screenshots (fix C).
describe('cpOptions', () => {
  it('reads a letter next to the digits as the digit it looks like', () => {
    expect(cpOptions('crl161\n')).toEqual([1161]);
    expect(cpOptions('crb7/ |\n')).toEqual([67]);
  });

  it('joins digits a space split, after the CP label', () => {
    expect(cpOptions('379\ncpl 75\nCella,\n')).toContain(175);
  });

  it('leaves out what the band already reads as, and letters away from digits', () => {
    expect(cpOptions('cr2488\n')).toEqual([]);
    expect(cpOptions('vrooTws ww tdi\ncpl, |\n')).toEqual([]);
  });
});

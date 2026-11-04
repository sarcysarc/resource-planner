import { describe, expect, it } from 'vitest';
import { wordsIn } from '../../../src/core/screen/anchors';
import { readTotals, totalRegions } from '../../../src/core/screen/totals';
import type { Scan, Word } from '../../../src/core/screen/types';
import { word } from './wordsOf';

// Boxes in pixels of a 720-wide screen, as fractions of the width.
const px = (text: string, line: number, [x0, y0, x1, y1]: number[]): Word => word(text, line, [x0, y0, x1, y1].map((v) => v / 720));

// The layout of a Pokémon screen's resource rows, with made-up numbers.
const ROWS = [
  px('123,456', 0, [131, 61, 269, 99]),
  px('£9', 0, [458, 61, 518, 99]),
  px('STARDUST', 1, [157, 114, 262, 127]),
  px('ARON', 1, [441, 114, 498, 127]),
  px('CANDY', 1, [507, 114, 578, 127]),
  px('S44', 2, [148, 186, 230, 220]),
  px('321', 2, [470, 186, 536, 220]),
  px('ARON', 3, [126, 234, 184, 247]),
  px('CANDY', 3, [193, 234, 263, 247]),
  px('XL', 3, [272, 234, 294, 247]),
  px('MEGA', 3, [485, 234, 544, 247]),
  px('POWER', 4, [114, 321, 224, 355]),
  px('UP', 4, [235, 321, 274, 355]),
];

// "GROWLITHE / CANDY" wraps, and the XL label sits beside it.
const WRAPPED = [
  px('123,456', 0, [81, 442, 219, 481]),
  px('77', 0, [318, 442, 398, 481]),
  px('go', 0, [547, 442, 608, 481]),
  px('STARDUST', 1, [107, 491, 213, 505]),
  px('GROWLITHE', 1, [318, 491, 441, 505]),
  px('GROWLITHE', 1, [538, 491, 661, 505]),
  px('CANDY', 2, [345, 519, 416, 533]),
  px('CANDY', 2, [551, 519, 622, 533]),
  px('XL', 2, [629, 519, 652, 533]),
];

const textIn = (words: Word[], name: 'stardust' | 'candy' | 'xl') =>
  wordsIn(words, totalRegions(words)[name]!.box).map((w) => w.text);

describe('totalRegions', () => {
  it('looks above STARDUST, the family Candy label and the Candy XL label', () => {
    expect(textIn(ROWS, 'stardust')).toEqual(['123,456']);
    expect(textIn(ROWS, 'candy')).toEqual(['£9']);
    expect(textIn(ROWS, 'xl')).toEqual(['S44']);
  });

  it('reads the totals in the dark teal of the labels', () => {
    expect(Object.values(totalRegions(ROWS)).map((r) => r.ink)).toEqual(['teal', 'teal', 'teal']);
  });

  it('finds a family name that wraps above its CANDY label', () => {
    expect(textIn(WRAPPED, 'candy')).toEqual(['77']);
    expect(textIn(WRAPPED, 'xl')).toEqual(['go']);
  });

  it('still finds the Candy total when OCR lost the family name', () => {
    const lost = ROWS.filter((w) => !(w.text === 'ARON' && w.line === 1));
    expect(textIn(lost, 'candy')).toEqual(['£9']);
  });

  it('accepts STARDUST with its first letter cut off', () => {
    const cut = ROWS.map((w) => (w.text === 'STARDUST' ? { ...w, text: 'TARDUST' } : w));
    expect(textIn(cut, 'stardust')).toEqual(['123,456']);
  });

  it('has no regions when the labels are not on screen', () => {
    expect(totalRegions(ROWS.slice(-2))).toEqual({});
  });
});

const scan = (words: Word[], digits: Scan['digits']): Scan => ({ words, cpText: '', digits });

describe('readTotals', () => {
  it('reads each total from its second-pass digits', () => {
    expect(readTotals(scan(ROWS, { stardust: '123,456\n', candy: '9', xl: '44' }))).toEqual({ stardust: 123456, candy: 9, xl: 44 });
  });

  it('takes the longest well-formed number and drops the rest', () => {
    expect(readTotals(scan(ROWS, { stardust: '7 1,234,567', candy: '12,34', xl: '' }))).toEqual({ stardust: 1234567 });
  });

  it('drops a Stardust icon read as an extra leading digit', () => {
    expect(readTotals(scan(ROWS, { stardust: '1246,802' }))).toEqual({ stardust: 246802 });
  });

  it('counts XL Candy as 0 when its row is missing between the Candy label and the buttons', () => {
    const noXl = ROWS.filter((w) => w.line !== 3);
    expect(readTotals(scan(noXl, { candy: '9' }))).toEqual({ candy: 9, xl: 0 });
  });

  it('does not guess XL Candy when the buttons are hidden, as on an appraisal', () => {
    const covered = ROWS.filter((w) => w.line < 3);
    expect(readTotals(scan(covered, { candy: '9' }))).toEqual({ candy: 9 });
  });

  it('gives nothing without readable digits', () => {
    expect(readTotals(scan(ROWS, {}))).toEqual({});
  });
});

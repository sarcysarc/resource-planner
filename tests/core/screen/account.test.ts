import { describe, expect, it } from 'vitest';
import { levelRegion, readBag, readTrainerLevel } from '../../../src/core/screen/account';
import { word, wordsOf } from './wordsOf';

// The list view of the bag: the name on the right, the count badge below-left of it.
const rareCandy = [
  word('Rare', 0, [0.32, 1.0, 0.43, 1.04]),
  word('Candy', 0, [0.45, 1.0, 0.6, 1.04]),
  word('A', 1, [0.32, 1.07, 0.34, 1.1]),
  word('x12', 2, [0.09, 1.15, 0.16, 1.19]),
  word('Candy.', 2, [0.52, 1.16, 0.63, 1.19]),
];
const rareXl = [
  word('Rare', 3, [0.32, 1.35, 0.43, 1.39]),
  word('Candy', 3, [0.45, 1.35, 0.6, 1.39]),
  word('XL', 3, [0.62, 1.35, 0.68, 1.39]),
  word('x7', 4, [0.09, 1.5, 0.13, 1.54]),
];

describe('readBag', () => {
  it('reads Rare Candy and Rare Candy XL from the count badges under their names', () => {
    expect(readBag([...rareCandy, ...rareXl])).toEqual({ rareCandy: 12, rareXl: 7 });
  });

  it('skips icon junk read on the name’s line', () => {
    const junk = word('3', 3, [0.16, 1.36, 0.18, 1.37]);
    expect(readBag([...rareXl.slice(0, 3), junk, rareXl[3]])).toEqual({ rareXl: 7 });
  });

  it('accepts a count read without its x', () => {
    const words = rareCandy.map((w) => (w.text === 'x12' ? { ...w, text: '12' } : w));
    expect(readBag(words)).toEqual({ rareCandy: 12 });
  });

  it('gives nothing for a name whose badge is scrolled off', () => {
    expect(readBag(rareCandy.filter((w) => w.text !== 'x12'))).toEqual({});
  });

  it('does not take the next item’s badge', () => {
    const next = word('x99', 9, [0.09, 1.4, 0.16, 1.44]);
    expect(readBag([...rareCandy.slice(0, 3), next])).toEqual({});
  });

  it('gives nothing when neither name shows', () => {
    expect(readBag(wordsOf('Lucky Egg\nx18'))).toEqual({});
  });
});

describe('levelRegion', () => {
  it('is the area above the LEVEL label, kept in colour', () => {
    const region = levelRegion([word('LEVEL', 3, [0.07, 1.23, 0.16, 1.25])]);
    expect(region?.ink).toBe('colour');
    expect(region!.box.y1).toBeLessThan(1.23);
    expect(region!.box.y0).toBeLessThan(1.16);
  });

  it('ignores "level" in running text, such as the next level’s rewards', () => {
    expect(levelRegion(wordsOf('Rewards at level 43!'))).toBeUndefined();
  });
});

describe('readTrainerLevel', () => {
  it('reads the level from the second-pass digits', () => {
    expect(readTrainerLevel(' 37\n')).toBe(37);
  });

  it('gives nothing for a number no trainer can have', () => {
    expect(readTrainerLevel('0')).toBeUndefined();
    expect(readTrainerLevel('51')).toBeUndefined();
    expect(readTrainerLevel(undefined)).toBeUndefined();
  });
});

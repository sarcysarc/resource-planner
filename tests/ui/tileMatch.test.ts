import { describe, expect, it } from 'vitest';
import type { Reading } from '../../src/core/screen/types';
import { matchTile, matchTiles } from '../../src/ui/tileMatch';

const familyOf = (r: Reading) => (r.family ? `FAMILY_${r.family}` : undefined);
const tiles = [
  { id: 'a', cp: 900, hp: 120, family: 'FAMILY_BULBASAUR' },
  { id: 'b', cp: 800, hp: 110, family: 'FAMILY_BULBASAUR' },
  { id: 'c', family: 'FAMILY_ARON' },
];

describe('matchTile', () => {
  it('finds the tile whose CP and HP agree', () => {
    expect(matchTile(tiles, { cp: 800, hp: 110 }, familyOf)).toBe('b');
    expect(matchTile(tiles, { hp: 120 }, familyOf)).toBe('a');
  });

  it('tells apart two with the same CP and HP by their IVs, when both have them', () => {
    const appraised = [{ ...tiles[0], ivs: '1/2/3' }];
    expect(matchTile(appraised, { cp: 900, hp: 120, ivs: { atk: 1, def: 2, hp: 3 } }, familyOf)).toBe('a');
    expect(matchTile(appraised, { cp: 900, hp: 120, ivs: { atk: 15, def: 2, hp: 3 } }, familyOf)).toBeUndefined();
    expect(matchTile(appraised, { cp: 900, hp: 120 }, familyOf)).toBe('a');
  });

  it('lists every tile a screenshot without IVs fits, first one first', () => {
    const twins = [{ ...tiles[0], ivs: '1/2/3' }, { ...tiles[0], id: 'z', ivs: '4/5/6' }, tiles[1]];
    expect(matchTiles(twins, { cp: 900, hp: 120 }, familyOf)).toEqual(['a', 'z']);
    expect(matchTiles(twins, { family: 'BULBASAUR' }, familyOf)).toEqual(['b']);
    expect(matchTiles(twins, { family: 'RALTS' }, familyOf)).toEqual([]);
  });

  it('needs at least one number on both, and no clash in family', () => {
    expect(matchTile(tiles, { cp: 900, family: 'ARON' }, familyOf)).toBeUndefined();
    expect(matchTile(tiles, { cp: 700 }, familyOf)).toBeUndefined();
  });

  it('gives a screenshot without numbers to the last tile of its family', () => {
    expect(matchTile(tiles, { family: 'BULBASAUR', evolveCandy: 25 }, familyOf)).toBe('b');
    expect(matchTile(tiles, { family: 'RALTS' }, familyOf)).toBeUndefined();
  });
});

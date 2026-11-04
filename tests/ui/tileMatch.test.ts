import { describe, expect, it } from 'vitest';
import type { Reading } from '../../src/core/screen/types';
import { matchTile } from '../../src/ui/tileMatch';

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

  it('needs at least one number on both, and no clash in family', () => {
    expect(matchTile(tiles, { cp: 900, family: 'ARON' }, familyOf)).toBeUndefined();
    expect(matchTile(tiles, { cp: 700 }, familyOf)).toBeUndefined();
  });

  it('gives a screenshot without numbers to the last tile of its family', () => {
    expect(matchTile(tiles, { family: 'BULBASAUR', evolveCandy: 25 }, familyOf)).toBe('b');
    expect(matchTile(tiles, { family: 'RALTS' }, familyOf)).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { chargedMoves } from '../../src/core/moveset';

const species = { charged: ['SEED', 'PETAL'] };

describe('chargedMoves', () => {
  it('lists the species’ charged moves for a normal Pokémon', () => {
    expect(chargedMoves(species, 'normal')).toEqual(['SEED', 'PETAL']);
  });

  it('adds Frustration for a Shadow and Return for a Purified', () => {
    expect(chargedMoves(species, 'shadow')).toEqual(['SEED', 'PETAL', 'FRUSTRATION']);
    expect(chargedMoves(species, 'purified')).toEqual(['SEED', 'PETAL', 'RETURN']);
  });
});

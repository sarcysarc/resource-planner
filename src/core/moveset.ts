import type { Variant } from './types';

// PvPoke's species lists leave out the moves a Shadow or Purified Pokémon gets by
// being one (ADR 0007).
const VARIANT_MOVES: Record<Variant, string[]> = {
  normal: [],
  shadow: ['FRUSTRATION'],
  purified: ['RETURN'],
};

/** The charged moves a Pokémon of this species and variant can have. */
export function chargedMoves(species: { charged: readonly string[] }, variant: Variant): string[] {
  return [...species.charged, ...VARIANT_MOVES[variant]];
}

import { z } from 'zod';
import { MAX_TRAINER_LEVEL } from '../core/levels';
import { blank, fieldValues, firstError, type Result } from './form';

/** Rare Candy can become any species' Candy; Rare Candy XL any species' XL. */
export interface Rare {
  candy: number;
  xl: number;
}

export interface Account {
  rare: Rare;
  /** Caps how far a Pokémon can be powered up; undefined means no limit. */
  trainerLevel?: number;
}

const count = z.preprocess(blank, z.coerce.number().int().min(0).optional());
const AccountFields = z.object({
  rareCandy: count,
  rareXl: count,
  trainerLevel: z.preprocess(blank, z.coerce.number().int().min(1).max(MAX_TRAINER_LEVEL).optional()),
});

/** Blank Rare Candy means none; a blank trainer level means no limit. */
export function readAccount(root: ParentNode): Result<Account> {
  const parsed = AccountFields.safeParse(fieldValues(root));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { rareCandy, rareXl, trainerLevel } = parsed.data;
  return { ok: true, value: { rare: { candy: rareCandy ?? 0, xl: rareXl ?? 0 }, trainerLevel } };
}

// The answer key for the stress run (ADR 0016): what each real screenshot shows, written by
// hand and kept in the gitignored screenshots/stress/truth.json, never in the repository.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { Scan } from '../src/core/screen/types';
import { scanFile } from './plugin';

const IVS = z.tuple([z.number(), z.number(), z.number()]);

/** One screenshot. `cp: null` means the Pokémon covers its CP, so nothing should be read. */
const Shot = z.object({
  screen: z.enum(['top', 'bottom', 'appraisal', 'other']),
  id: z.string().optional(),
  name: z.string().optional(),
  cp: z.number().nullable().optional(),
  hp: z.number().optional(),
  ivs: IVS.optional(),
  variant: z.enum(['normal', 'shadow', 'purified']).optional(),
  lucky: z.boolean().optional(),
  family: z.string().optional(),
  note: z.string().optional(),
});

/** One Pokémon: what its tile should say once all its screenshots are in. A grid holds one
 * evolution line (ADR 0015), so `line` says which grid it belongs in. */
const Pokemon = z.object({ name: z.string(), cp: z.number(), line: z.string(), ivs: IVS.optional() });

const Truth = z.object({ shots: z.record(z.string(), Shot), pokemon: z.record(z.string(), Pokemon) });

export type Shot = z.infer<typeof Shot>;
export type Truth = z.infer<typeof Truth>;

export const TRUTH = join('screenshots', 'stress', 'truth.json');

export const loadTruth = (): Truth | undefined =>
  existsSync(TRUTH) ? Truth.parse(JSON.parse(readFileSync(TRUTH, 'utf8'))) : undefined;

/** The saved scan of a screenshot, or why it could not be read. */
export interface Saved {
  name: string;
  ms: number;
  bytes: number;
  scan?: Scan;
  error?: string;
}

export const loadScan = (name: string): Saved | undefined =>
  existsSync(scanFile(name)) ? (JSON.parse(readFileSync(scanFile(name), 'utf8')) as Saved) : undefined;

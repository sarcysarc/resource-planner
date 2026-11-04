import { z } from 'zod';
import type { Candidate } from '../core/goals';
import { levelFromCp } from '../core/levels';
import type { Cost } from '../core/types';
import { MAX_POWER_UP_LEVEL } from '../data/powerUpCosts';
import { evolutionLine, type Species, type SpeciesIndex } from './species';

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const blank = (v: unknown) => (v === '' ? undefined : v);
const iv = z.preprocess(blank, z.coerce.number().int().min(0).max(15));
export const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blank, schema.optional());
const count = z.preprocess(blank, z.coerce.number().int().min(0).optional());

const CandidateFields = z.object({
  form: z.string().min(1, 'Pick the current form'),
  atk: iv,
  def: iv,
  hp: iv,
  level: optional(z.coerce.number().min(1).max(MAX_POWER_UP_LEVEL).multipleOf(0.5)),
  cp: optional(z.coerce.number().int().min(10)),
  variant: z.enum(['normal', 'shadow', 'purified']),
  lucky: z.boolean(),
  bestBuddy: z.boolean(),
  secondMove: z.boolean(),
  evolveCandy: count,
});

const ResourceFields = z.object({ stardust: count, candy: count, xl: count });

const LABELS: Record<string, string> = {
  atk: 'Attack IV', def: 'Defense IV', hp: 'HP IV', level: 'Level', cp: 'CP',
  evolveCandy: 'Candy to evolve', stardust: 'Stardust', candy: 'Candy', xl: 'XL Candy',
  seenHp: 'HP shown', dust: 'Stardust to power up', stars: 'Appraisal stars',
  atkBar: 'Attack bar', defBar: 'Defense bar', hpBar: 'HP bar',
  rareCandy: 'Rare Candy', rareXl: 'Rare Candy XL', trainerLevel: 'Trainer level',
};

export function fieldValues(root: ParentNode): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[name], select[name]').forEach((el) => {
    values[el.name] = el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked : el.value;
  });
  return values;
}

export function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  const field = String(issue.path[0] ?? '');
  return `${LABELS[field] ?? field}: ${issue.message}`;
}

type Fields = z.infer<typeof CandidateFields>;

function resolveLevel(fields: Fields, form: Species): Result<number> {
  if (fields.level !== undefined) return { ok: true, value: fields.level };
  if (fields.cp === undefined) return { ok: false, error: 'Enter a level or a CP' };
  const ivs = { atk: fields.atk, def: fields.def, hp: fields.hp };
  const level = levelFromCp({ base: form.base, ivs, cp: fields.cp });
  if (level === null || level > MAX_POWER_UP_LEVEL) {
    return { ok: false, error: `No level gives CP ${fields.cp} with those IVs` };
  }
  return { ok: true, value: level };
}

function toCandidate(fields: Fields, level: number, target: Species): Candidate {
  return {
    base: target.base,
    ivs: { atk: fields.atk, def: fields.def, hp: fields.hp },
    level,
    mods: { variant: fields.variant, lucky: fields.lucky },
    bestBuddy: fields.bestBuddy,
    secondMoveUnlocked: fields.secondMove,
    secondMoveDust: target.secondMoveDust ?? 0,
    evolveCandy: fields.evolveCandy ?? 0,
  };
}

export interface CandidateSource {
  root: ParentNode;
  index: SpeciesIndex;
  target: Species;
}

/** The form the candidate is in now, if it is in the target's line. */
export function formOf({ root, index, target }: CandidateSource): Species | undefined {
  const id = root.querySelector<HTMLInputElement | HTMLSelectElement>('[name="form"]')?.value;
  return evolutionLine(index, target).find((s) => s.id === id);
}

export function readCandidate(source: CandidateSource): Result<Candidate> {
  const { root, target } = source;
  const parsed = CandidateFields.safeParse(fieldValues(root));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const form = formOf(source);
  if (!form) return { ok: false, error: `${parsed.data.form} does not evolve into ${target.name}` };
  const level = resolveLevel(parsed.data, form);
  return level.ok ? { ok: true, value: toCandidate(parsed.data, level.value, target) } : level;
}

/** Blank fields mean "unlimited", so they never block a recommendation. */
export function readResources(root: ParentNode): Result<Cost> {
  const parsed = ResourceFields.safeParse(fieldValues(root));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { stardust, candy, xl } = parsed.data;
  return { ok: true, value: { stardust: stardust ?? Infinity, candy: candy ?? Infinity, xl: xl ?? Infinity } };
}

import type { Conflict } from '../core/screen/merge';
import type { IVs } from '../core/types';

export const CONFLICT_NAMES: Record<Conflict['field'], string> = {
  cp: 'CP',
  hp: 'HP',
  dust: 'the power-up Stardust',
  ivs: 'IVs',
  name: 'the name',
  family: 'the Candy family',
  variant: 'Shadow or Purified',
  lucky: 'Lucky',
  secondMove: 'the second move',
  evolveCandy: 'the evolve Candy',
};

export function formatValue(field: Conflict['field'], value: unknown): string {
  if (field === 'ivs') return Object.values(value as IVs).join('/');
  if (field === 'secondMove') return value ? 'unlocked' : 'locked';
  return String(value);
}

/** A sentence for the status line about values the screenshots disagree on, or ''. */
export function conflictNote(conflicts: Conflict[]): string {
  if (!conflicts.length) return '';
  const parts = conflicts.map(({ field, values }) => `${CONFLICT_NAMES[field]}: ${values.map((v) => formatValue(field, v)).join(' or ')}`);
  return ` The screenshots disagree on ${parts.join('; ')}. Type the right one${parts.length > 1 ? 's' : ''}.`;
}

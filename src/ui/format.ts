import type { GoalId, GoalResult } from '../core/goals';
import type { Cost } from '../core/types';
import type { Verdict } from '../core/verdict';
import type { Rare } from './account';

type Eligible = Extract<GoalResult, { eligible: true }>;

export const GOAL_LABELS: Record<GoalId, string> = {
  great: 'Great League (1,500 CP)',
  ultra: 'Ultra League (2,500 CP)',
  master: 'Master League',
  raid: 'Raids & gym attack',
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  keep: 'Keep investing',
  switch: 'Switch to the alternative',
  save: 'Save for the alternative',
  neither: 'Neither fits this goal',
};

const n = (value: number) => value.toLocaleString('en-US');

function costParts(cost: Cost): string[] {
  const parts: string[] = [];
  if (cost.stardust > 0) parts.push(`${n(cost.stardust)} Stardust`);
  if (cost.candy > 0) parts.push(`${n(cost.candy)} Candy`);
  if (cost.xl > 0) parts.push(`${n(cost.xl)} XL`);
  return parts;
}

export function formatCost(cost: Cost): string {
  const parts = costParts(cost);
  return parts.length ? parts.join(' · ') : 'Nothing more to spend';
}

// Rare Candy is only suggested: the player decides whether to spend it on this Pokémon.
function rareNote(short: Cost, rare: Rare | undefined): string {
  const parts: string[] = [];
  if (short.candy > 0 && rare?.candy) parts.push(`${n(rare.candy)} Rare Candy`);
  if (short.xl > 0 && rare?.xl) parts.push(`${n(rare.xl)} Rare Candy XL`);
  return parts.length ? `; you have ${parts.join(' and ')}` : '';
}

export function formatShortfall(cost: Cost, resources: Cost, rare?: Rare): string {
  const short = {
    stardust: Math.max(0, cost.stardust - resources.stardust),
    candy: Math.max(0, cost.candy - resources.candy),
    xl: Math.max(0, cost.xl - resources.xl),
  };
  const parts = costParts(short);
  return parts.length ? `Short ${parts.join(' · ')}${rareNote(short, rare)}` : 'Affordable now';
}

export function formatSummary(result: Eligible): string {
  const buddy = result.effectiveLevel > result.targetLevel ? ' (+1 Best Buddy)' : '';
  const head = `Power up to Lv ${result.targetLevel}${buddy} · CP ${n(result.cp)}`;
  if (!result.rank) return `${head} · Attack ${result.value.toFixed(1)}`;
  return `${head} · Rank ${n(result.rank.rank)} (${result.rank.percent.toFixed(1)}%)`;
}

export function formatChange(change: number | null): string {
  if (change === null) return '';
  const sign = change >= 0 ? '+' : '';
  return `Alternative ${sign}${(change * 100).toFixed(1)}% vs current`;
}

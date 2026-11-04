import type { CostPart, GoalId, GoalResult } from '../core/goals';
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

/** How an option is shown: its column heading and how a verdict names it. */
export interface OptionLabel {
  heading: string;
  name: string;
  /** What choosing it means, when more than switching to it, e.g. "purify the current one". */
  action?: string;
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function formatVerdict(verdict: Verdict, options: OptionLabel[]): string {
  if (verdict.kind === 'neither') return `${options.length === 2 ? 'Neither' : 'None'} fits this goal`;
  if (verdict.kind === 'keep') return 'Keep investing';
  const { name, action } = options[verdict.option];
  if (verdict.kind === 'switch') return action ? capitalise(action) : `Switch to ${name}`;
  return action ? `Save to ${action}` : `Save for ${name}`;
}

const PART_NAMES: Record<CostPart['kind'], string> = {
  powerUps: 'power-ups',
  secondMove: 'second move',
  evolve: 'evolve',
  purify: 'purify',
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

/** Where a cost comes from, when it has more than one part. */
export function formatParts(parts: readonly CostPart[]): string {
  if (parts.length < 2) return '';
  return capitalise(parts.map((part) => `${PART_NAMES[part.kind]} ${formatCost(part.cost)}`).join('; '));
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
  if (result.moves) {
    return `${head} · ${result.value.toFixed(1)} damage per second with ${result.moves.fast} and ${result.moves.charged}`;
  }
  const bonus = result.basis === 'shadowAttack' ? ' with the Shadow bonus' : '';
  if (!result.rank) return `${head} · Attack ${result.value.toFixed(1)}${bonus}`;
  return `${head} · Rank ${n(result.rank.rank)} (${result.rank.percent.toFixed(1)}%)`;
}

export function formatChange(change: number | null): string {
  if (change === null) return '';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${(change * 100).toFixed(1)}% vs current`;
}

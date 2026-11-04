// Ranks every option for each kind of battle and suggests which Pokémon could be
// transferred (ADR 0015).
import type { Comparison } from '../core/compare';

const valueOf = (row: Comparison, option: number) => {
  const result = row.results[option];
  return result.eligible ? result.value : -Infinity;
};

/** Option indices, best first: the verdict's pick, then by value; those that can't enter last. */
export function rankOptions(row: Comparison): number[] {
  const pick = row.verdict.kind === 'neither' ? undefined : row.verdict.option;
  const rest = row.results.map((_, i) => i).filter((i) => i !== pick);
  rest.sort((a, b) => valueOf(row, b) - valueOf(row, a) || a - b);
  return pick === undefined ? rest : [pick, ...rest];
}

/** "A", "A and B", "A, B and C". */
export function listNames(names: readonly string[]): string {
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/**
 * The tiles that are the top pick for no kind of battle, each with the reason.
 * `owners` gives the tile of each option (a purified option shares its tile's id).
 */
export function transferSuggestions(rows: readonly Comparison[], owners: readonly string[], names: Record<string, string>): Map<string, string> {
  const picks = new Set(rows.flatMap((row) => (row.verdict.kind === 'neither' ? [] : [owners[row.verdict.option]])));
  const tiles = [...new Set(owners)];
  const winners = tiles.filter((id) => picks.has(id));
  const suggestions = new Map<string, string>();
  if (!winners.length) return suggestions;
  const better = `${listNames(winners.map((id) => names[id]))} ${winners.length > 1 ? 'do' : 'does'} better.`;
  for (const id of tiles) {
    if (!winners.includes(id)) suggestions.set(id, `Not the best for any kind of battle: ${better}`);
  }
  return suggestions;
}

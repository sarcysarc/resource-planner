import type { AccountName, TotalName, Totals } from '../core/screen/types';

type Name = TotalName | AccountName;
const NAMES: Record<Name, (value: string) => string> = {
  stardust: (v) => `${v} Stardust`,
  candy: (v) => `${v} Candy`,
  xl: (v) => `${v} XL Candy`,
  rareCandy: (v) => `${v} Rare Candy`,
  rareXl: (v) => `${v} Rare Candy XL`,
  trainerLevel: (v) => `trainer level ${v}`,
};
// Only these belong to one family; the rest are the account's.
const FAMILY: Name[] = ['candy', 'xl'];
const HIDDEN_CANDY = 'Candy not visible. Add a screenshot of the Pokémon screen, or type it.';

const field = (root: ParentNode, name: Name) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!;

/**
 * Fills the shared resource fields from the totals a screen showed. Stardust, Rare Candy
 * and the trainer level are the account's; Candy and XL count only when the Pokémon
 * shares the target's family.
 * Returns a note for the status line.
 */
export function fillResources(root: ParentNode, totals: Totals, sameFamily: boolean): string {
  const names = (Object.keys(NAMES) as Name[]).filter(
    (name) => totals[name] !== undefined && (sameFamily || !FAMILY.includes(name)),
  );
  for (const name of names) field(root, name).value = String(totals[name]);
  if (!names.length) return '';
  const parts = names.map((name) => NAMES[name](totals[name]!.toLocaleString('en')));
  const hidden = sameFamily && totals.candy === undefined && !field(root, 'candy').value;
  return `Your totals: ${parts.join(', ')}.${hidden ? ` ${HIDDEN_CANDY}` : ''}`;
}

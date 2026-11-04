import type { TotalName, Totals } from '../core/screen/types';

const NAMES: Record<TotalName, string> = { stardust: 'Stardust', candy: 'Candy', xl: 'XL Candy' };
const HIDDEN_CANDY = 'Candy not visible. Add a screenshot of the Pokémon screen, or type it.';

const field = (root: ParentNode, name: TotalName) => root.querySelector<HTMLInputElement>(`[name="${name}"]`)!;

/**
 * Fills the shared resource fields from the totals a screen showed. Stardust is the
 * account's; Candy and XL count only when the Pokémon shares the target's family.
 * Returns a note for the status line.
 */
export function fillResources(root: ParentNode, totals: Totals, sameFamily: boolean): string {
  const names = (Object.keys(NAMES) as TotalName[]).filter(
    (name) => totals[name] !== undefined && (name === 'stardust' || sameFamily),
  );
  for (const name of names) field(root, name).value = String(totals[name]);
  if (!names.length) return '';
  const parts = names.map((name) => `${totals[name]!.toLocaleString('en')} ${NAMES[name]}`);
  const hidden = sameFamily && totals.candy === undefined && !field(root, 'candy').value;
  return `Your totals: ${parts.join(', ')}.${hidden ? ` ${HIDDEN_CANDY}` : ''}`;
}

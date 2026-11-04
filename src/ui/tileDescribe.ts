// What a tile shows, read from its fields (ADR 0015): its name, CP and IVs, and which
// screenshot would fill each gap.
import { tileNotes, tileTitle } from './tileText';
import type { TileView } from './tileView';

const valueOf = (root: ParentNode, name: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? '';
const knownOf = (root: HTMLElement) => (root.dataset.known ? root.dataset.known.split(',') : []);

/** Records fields read from a screenshot or set by the player. */
export function markKnown(root: HTMLElement, fields: readonly string[]): void {
  root.dataset.known = [...new Set([...knownOf(root), ...fields])].join(',');
}

// The last form in the list is the target; an earlier one still has to evolve.
function needsEvolve(root: HTMLElement): boolean {
  const select = root.querySelector<HTMLSelectElement>('select[name="form"]');
  const last = select?.options[select.options.length - 1];
  return !!last && select.value !== last.value && valueOf(root, 'evolveCandy') === '';
}

// Its own evolve step was read from a screenshot, so the next form's is the one missing.
function laterForm(root: HTMLElement): string | undefined {
  const select = root.querySelector<HTMLSelectElement>('select[name="form"]');
  return knownOf(root).includes('evolveStep') ? select?.options[select.selectedIndex + 1]?.text : undefined;
}

export function describeTile(root: HTMLElement): TileView {
  const select = root.querySelector<HTMLSelectElement>('select[name="form"]');
  const ivs = [valueOf(root, 'atk'), valueOf(root, 'def'), valueOf(root, 'hp')] as const;
  const name = select?.selectedOptions[0]?.text ?? '';
  return {
    title: tileTitle({ name, cp: valueOf(root, 'cp'), level: valueOf(root, 'level'), ivs }),
    notes: tileNotes({ ivs: ivs.every((v) => v !== ''), needsEvolve: needsEvolve(root), known: new Set(knownOf(root)), later: laterForm(root) }),
  };
}

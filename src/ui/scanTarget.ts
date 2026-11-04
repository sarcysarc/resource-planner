import type { Reading } from '../core/screen/types';
import { resolveSpecies } from './scanSpecies';
import { findSpecies, type Species, type SpeciesIndex } from './species';

export interface SpeciesPick {
  index: SpeciesIndex;
  /** The battle target, shared by both candidates. */
  target: HTMLInputElement;
  /** The candidate fieldset the screenshot was read into. */
  root: ParentNode;
  /** Refills the form choices after the target changes. */
  refresh: () => void;
}

function addStatus(root: ParentNode, note: string): void {
  const status = root.querySelector('[data-scan-status]')!;
  status.textContent = `${status.textContent} ${note}`;
}

const listNames = (members: Species[]) =>
  `${members.slice(0, -1).map((s) => s.name).join(', ')} or ${members.at(-1)!.name}`;

function selectForm(pick: SpeciesPick, species: Species): void {
  const select = pick.root.querySelector<HTMLSelectElement>('select[name="form"]')!;
  if ([...select.options].some((o) => o.value === species.id)) select.value = species.id;
  else addStatus(pick.root, `This is ${species.name}, which does not evolve into ${pick.target.value}.`);
}

/** Uses the species a screenshot shows: fills an empty target and picks the current form. */
export function applySpecies(pick: SpeciesPick, reading: Reading): void {
  const found = resolveSpecies(pick.index, reading);
  if (found.length > 1) return addStatus(pick.root, `Which is it: ${listNames(found)}? Pick it as the target or the form.`);
  if (!found.length) return;
  if (!findSpecies(pick.index, pick.target.value)) {
    pick.target.value = found[0].name;
    pick.refresh();
  }
  selectForm(pick, found[0]);
}

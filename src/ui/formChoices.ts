// Every tile's "Current form" list is the target's evolution line (ADR 0015). A form
// someone or a screenshot chose is kept while it is still in the new line, so moving the
// target up a line leaves an earlier stage alone. One read from outside the line stays listed
// after it, so its tile is named by what was read (issue #11); comparing it says why it can't be.
import { candidateRoots } from './candidateFields';
import { evolutionLine, findSpecies, type Species, type SpeciesIndex } from './species';

export interface FormChoices {
  target: HTMLInputElement;
  /** Where the candidates are; they can be added at any time. */
  area: HTMLElement;
  index: SpeciesIndex;
}

const formSelect = (root: ParentNode) => root.querySelector<HTMLSelectElement>('select[name="form"]')!;

/** Selects the form read, adding it to the list when it is outside the target's line. */
export function selectRead(select: HTMLSelectElement, species: Species): void {
  if (![...select.options].some((o) => o.value === species.id)) select.append(new Option(species.name, species.id));
  select.value = species.id;
}

function update({ target, area, index }: FormChoices): void {
  const species = findSpecies(index, target.value);
  if (!species) return;
  const line = evolutionLine(index, species);
  for (const select of candidateRoots(area).map(formSelect)) {
    const chosen = select.dataset.chosen ? findSpecies(index, select.dataset.chosen) : undefined;
    select.replaceChildren(...line.map((s) => new Option(s.name, s.id)));
    selectRead(select, chosen ?? species);
  }
}

/** Wire this before anything else that follows the target, so the lists are filled first. */
export function wireFormChoices(w: FormChoices): void {
  w.target.addEventListener('change', () => update(w));
  w.area.addEventListener('change', (event) => {
    const select = event.target as HTMLSelectElement;
    if (select.name === 'form') select.dataset.chosen = select.value;
  });
}

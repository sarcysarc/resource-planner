// Every tile's "Current form" list is the target's evolution line (ADR 0015). A form
// someone or a screenshot chose is kept while it is still in the new line, so moving the
// target up a line leaves an earlier stage alone.
import { candidateRoots } from './candidateFields';
import { evolutionLine, findSpecies, type SpeciesIndex } from './species';

export interface FormChoices {
  target: HTMLInputElement;
  /** Where the candidates are; they can be added at any time. */
  area: HTMLElement;
  index: SpeciesIndex;
}

const formSelect = (root: ParentNode) => root.querySelector<HTMLSelectElement>('select[name="form"]')!;

function update({ target, area, index }: FormChoices): void {
  const species = findSpecies(index, target.value);
  if (!species) return;
  const line = evolutionLine(index, species);
  for (const select of candidateRoots(area).map(formSelect)) {
    const chosen = select.dataset.chosen;
    select.replaceChildren(...line.map((s) => new Option(s.name, s.id)));
    select.value = line.some((s) => s.id === chosen) ? chosen! : species.id;
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

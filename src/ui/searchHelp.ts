import { searchName, type Suggestion, suggestSearches } from './searches';
import { findSpecies, type SpeciesIndex } from './species';

export interface SearchWiring {
  target: HTMLInputElement;
  /** Holds a [data-searches-list] that is filled with the suggestions. */
  root: HTMLElement;
  index: SpeciesIndex;
}

async function copy(button: HTMLButtonElement, text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied';
  } catch {
    button.textContent = 'Copy by hand';
  }
}

function item(suggestion: Suggestion): HTMLLIElement {
  const li = document.createElement('li');
  const code = document.createElement('code');
  code.textContent = suggestion.text;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.textContent = 'Copy';
  button.addEventListener('click', () => void copy(button, suggestion.text));
  const purpose = document.createElement('span');
  purpose.className = 'muted';
  purpose.textContent = suggestion.purpose;
  li.append(code, button, purpose);
  return li;
}

function show(w: SearchWiring): void {
  const target = findSpecies(w.index, w.target.value);
  w.root.hidden = !target;
  if (!target) return;
  const list = w.root.querySelector('[data-searches-list]')!;
  list.replaceChildren(...suggestSearches(searchName(w.index, target)).map(item));
}

/** Shows in-game search strings that find the target's family, to screenshot from. */
export function wireSearches(w: SearchWiring): void {
  w.target.addEventListener('change', () => show(w));
}

// The page's three steps (ADR 0014): screenshots, then checking the details, then the answer.
// The later steps appear once screenshots are read or the player chooses to type.

const READ = 'Read from your screenshots. Check them against the game and fix anything that is wrong.';
const TYPE = 'Type in what the game shows for each Pokémon. Its appraisal gives the IVs.';

export interface Steps {
  /** Shows the later steps after screenshots were read. */
  reveal: () => void;
}

function show(doc: Document, note: string): void {
  for (const name of ['check', 'answer']) doc.querySelector<HTMLElement>(`[data-step="${name}"]`)!.hidden = false;
  doc.querySelector('[data-check-note]')!.textContent = note;
}

export function wireSteps(doc: Document): Steps {
  doc.querySelector('[data-step-skip]')!.addEventListener('click', () => show(doc, TYPE));
  return { reveal: () => show(doc, READ) };
}

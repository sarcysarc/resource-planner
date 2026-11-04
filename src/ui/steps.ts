// The page's three steps (ADR 0014): screenshots, then checking the details, then the answer.
// The later steps appear once screenshots are read, the player chooses to type, or a grid
// saved from last time comes back, which step 1 then names.

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

/** What was kept from last time: how many Pokémon, and the one to battle with. */
export interface SavedSummary {
  target: string;
  count: number;
}

export function savedNote(count: number, target: string): string {
  const what = target ? `${count} Pokémon (${target})` : `${count} Pokémon`;
  return `Saved from last time: ${what}. New screenshots join ${count === 1 ? 'it' : 'them'}.`;
}

const savedBox = (doc: Document) => doc.querySelector<HTMLElement>('[data-saved]')!;

/** Says in step 1 what the saved grid holds, and opens the later steps to show it. */
export function showSaved(doc: Document, { target, count }: SavedSummary): void {
  savedBox(doc).hidden = false;
  savedBox(doc).querySelector('[data-saved-note]')!.textContent = savedNote(count, target);
  show(doc, READ);
}

export function hideSaved(doc: Document): void {
  savedBox(doc).hidden = true;
}

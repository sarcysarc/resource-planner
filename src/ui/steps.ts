// The page's three steps (ADR 0014): screenshots, then checking the details, then the answer.
// The later steps appear once screenshots are read, the player chooses to type, or a grid
// saved from last time comes back, which step 1 then names.

const READ = 'Read from your screenshots. Check them against the game and fix anything that is wrong.';
const TYPE = 'Type in what the game shows for each Pokémon. Its appraisal gives the IVs.';

const WORKING = 'Working out each line…';

export interface Steps {
  /** Shows the later steps after screenshots were read, scrolled to step 2 (issue #6). */
  reveal: () => void;
  /** Runs a long task with step 1 saying each line is being worked out (issue #6). */
  working: (task: () => void) => Promise<void>;
}

const stepOf = (doc: Document, name: string) => doc.querySelector<HTMLElement>(`[data-step="${name}"]`)!;

function show(doc: Document, note: string): void {
  for (const name of ['check', 'answer']) stepOf(doc, name).hidden = false;
  doc.querySelector('[data-check-note]')!.textContent = note;
}

// Lets the page show a change before a task that blocks it; a hidden tab skips frames,
// so a timer goes on without one.
const painted = (view: Window) =>
  new Promise<void>((resolve) => {
    view.requestAnimationFrame(() => view.setTimeout(resolve));
    view.setTimeout(resolve, 100);
  });

async function working(doc: Document, task: () => void): Promise<void> {
  const status = doc.querySelector('[data-shots-status]')!;
  const before = status.textContent;
  status.textContent = WORKING;
  await painted(doc.defaultView!);
  try {
    task();
  } finally {
    status.textContent = before;
  }
}

export function wireSteps(doc: Document): Steps {
  doc.querySelector('[data-step-skip]')!.addEventListener('click', () => show(doc, TYPE));
  const reveal = () => (show(doc, READ), stepOf(doc, 'check').scrollIntoView({ block: 'start' }));
  return { reveal, working: (task) => working(doc, task) };
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

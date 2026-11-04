// Where each kind of error belongs, by how its message starts.
const PLACES: [prefix: string, selector: string, strip: boolean][] = [
  ['Resources: ', '[data-resources]', true],
  ['Pick the Pokémon', '[data-target-card]', false],
  ['Add another Pokémon', '[data-grid-card]', false],
];

/** A part of the form an error is about, and the start of the message that names it. */
export interface ErrorPlace {
  part: HTMLElement;
  prefix: string;
}

function clear(form: HTMLElement): void {
  form.querySelectorAll('.field-error').forEach((note) => note.remove());
  form.querySelectorAll('.invalid').forEach((part) => part.classList.remove('invalid'));
}

function findPlace(form: HTMLElement, message: string): ErrorPlace | undefined {
  const found = PLACES.find(([prefix]) => message.startsWith(prefix));
  const part = found && form.querySelector<HTMLElement>(found[1]);
  return part ? { part, prefix: found[2] ? found[0] : '' } : undefined;
}

function place(message: string, { part, prefix }: ErrorPlace): void {
  const note = part.ownerDocument.createElement('p');
  note.className = 'field-error';
  note.textContent = message.startsWith(prefix) ? message.slice(prefix.length) : message;
  part.classList.add('invalid');
  const legend = part.querySelector(':scope > legend');
  if (legend) legend.after(note);
  else part.prepend(note);
}

/**
 * Shows an error under the button and beside the part of the form it is about ('' clears
 * it): `at`, or else the part its start names.
 */
export function showError(form: HTMLElement, message: string, at?: ErrorPlace): void {
  clear(form);
  form.querySelector('#error')!.textContent = message;
  const where = message ? (at ?? findPlace(form, message)) : undefined;
  if (where) place(message, where);
}

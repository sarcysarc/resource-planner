// Where each kind of error belongs, by how its message starts.
const PLACES: [prefix: string, selector: string, strip: boolean][] = [
  ['Current: ', '[data-candidate="current"]', true],
  ['Alternative: ', '[data-candidate="alternative"]', true],
  ['Resources: ', '[data-resources]', true],
  ['Pick the Pokémon', '[data-target-card]', false],
];

function clear(form: HTMLElement): void {
  form.querySelectorAll('.field-error').forEach((note) => note.remove());
  form.querySelectorAll('.invalid').forEach((part) => part.classList.remove('invalid'));
}

function place(form: HTMLElement, message: string): void {
  const found = PLACES.find(([prefix]) => message.startsWith(prefix));
  const part = found && form.querySelector(found[1]);
  if (!found || !part) return;
  const note = form.ownerDocument.createElement('p');
  note.className = 'field-error';
  note.textContent = found[2] ? message.slice(found[0].length) : message;
  part.classList.add('invalid');
  const legend = part.querySelector(':scope > legend');
  if (legend) legend.after(note);
  else part.prepend(note);
}

/** Shows an error under the button and beside the part of the form it is about ('' clears it). */
export function showError(form: HTMLElement, message: string): void {
  clear(form);
  form.querySelector('#error')!.textContent = message;
  if (message) place(form, message);
}

// Step 1's questions (ADR 0015): one select per question, answered together with Continue.
// They say the Pokémon wait on them, and no answer is chosen for the player (issue #6).
import type { Question } from './questions';

const LEFT = 'Answer each question to go on.';

function ask(doc: Document, question: Question): [HTMLLabelElement, HTMLSelectElement] {
  const label = doc.createElement('label');
  const select = doc.createElement('select');
  const none = new Option('Choose…', '', true, true);
  none.disabled = true;
  select.append(none, ...question.choices.map(({ label: text, value }) => new Option(text, value)));
  label.append(question.text, select);
  return [label, select];
}

function intro(doc: Document, count: number): HTMLParagraphElement {
  const what = count === 1 ? '1 question' : `${count} questions`;
  return Object.assign(doc.createElement('p'), { textContent: `${what} before your Pokémon are shown:` });
}

// A question left unanswered keeps the box open and is pointed at.
function pointAt(note: HTMLElement, left: HTMLSelectElement): void {
  Object.assign(note, { textContent: LEFT, hidden: false });
  left.focus();
}

/** Shows the questions in `box` and resolves with each answer once the player taps Continue. */
export function askQuestions(box: HTMLElement, questions: readonly Question[]): Promise<[Question, string][]> {
  const doc = box.ownerDocument;
  const asked = questions.map((question) => ask(doc, question));
  const note = Object.assign(doc.createElement('p'), { className: 'field-error', hidden: true });
  const go = Object.assign(doc.createElement('button'), { type: 'button', textContent: 'Continue', className: 'primary' });
  box.replaceChildren(intro(doc, questions.length), ...asked.map(([label]) => label), note, go);
  box.hidden = false;
  return new Promise((resolve) => {
    go.addEventListener('click', () => {
      const left = asked.find(([, select]) => !select.value);
      if (left) return pointAt(note, left[1]);
      resolve(questions.map((question, i) => [question, asked[i][1].value]));
      box.replaceChildren();
      box.hidden = true;
    });
  });
}

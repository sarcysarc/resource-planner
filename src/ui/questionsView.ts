// Step 1's questions (ADR 0015): one select per question, answered together with Continue.
import type { Question } from './questions';

function ask(doc: Document, question: Question): [HTMLLabelElement, HTMLSelectElement] {
  const label = doc.createElement('label');
  const select = doc.createElement('select');
  select.append(...question.choices.map(({ label: text, value }) => new Option(text, value)));
  label.append(question.text, select);
  return [label, select];
}

/** Shows the questions in `box` and resolves with each answer once the player taps Continue. */
export function askQuestions(box: HTMLElement, questions: readonly Question[]): Promise<[Question, string][]> {
  const doc = box.ownerDocument;
  const asked = questions.map((question) => ask(doc, question));
  const go = doc.createElement('button');
  Object.assign(go, { type: 'button', textContent: 'Continue', className: 'primary' });
  box.replaceChildren(...asked.map(([label]) => label), go);
  box.hidden = false;
  return new Promise((resolve) => {
    go.addEventListener('click', () => {
      resolve(questions.map((question, i) => [question, asked[i][1].value]));
      box.replaceChildren();
      box.hidden = true;
    });
  });
}

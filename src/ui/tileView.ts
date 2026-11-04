// One tile in the grid of Pokémon (ADR 0015): a thumbnail, a name the player can match to
// the game, what is missing, and its Current and Transfer marks. Built with the DOM only,
// so read values are always set as text.

/** What a tile shows about its Pokémon. */
export interface TileView {
  title: string;
  notes: string[];
}

function el<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, className = ''): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  return node;
}

function mark(doc: Document, input: HTMLInputElement, text: string): HTMLLabelElement {
  const label = el(doc, 'label', 'check');
  label.append(input, ` ${text}`);
  return label;
}

function controls(doc: Document, id: string): HTMLElement {
  const current = el(doc, 'input');
  Object.assign(current, { type: 'radio', name: 'currentTile', value: id });
  const transfer = el(doc, 'input');
  transfer.type = 'checkbox';
  transfer.dataset.transfer = '';
  const row = el(doc, 'div', 'tile-marks');
  row.append(mark(doc, current, 'Current'), mark(doc, transfer, 'Transfer'));
  return row;
}

/** An empty tile for the Pokémon with this id. */
export function buildTile(doc: Document, id: string): HTMLElement {
  const tile = el(doc, 'div', 'tile');
  tile.dataset.tile = id;
  const thumb = el(doc, 'img', 'thumb');
  Object.assign(thumb, { alt: '', hidden: true });
  const open = el(doc, 'button', 'tile-open');
  open.type = 'button';
  open.dataset.title = '';
  const notes = el(doc, 'ul', 'tile-notes');
  notes.dataset.notes = '';
  const could = el(doc, 'p', 'could');
  Object.assign(could, { hidden: true });
  could.dataset.could = '';
  tile.append(thumb, open, notes, could, controls(doc, id));
  return tile;
}

export function showTile(tile: HTMLElement, { title, notes }: TileView): void {
  tile.querySelector('[data-title]')!.textContent = title;
  const items = notes.map((note) => Object.assign(tile.ownerDocument.createElement('li'), { textContent: note }));
  tile.querySelector('[data-notes]')!.replaceChildren(...items);
}

/** Labels the tile "Could transfer" with the reason, or removes the label. */
export function showSuggestion(tile: HTMLElement, reason: string | undefined): void {
  const could = tile.querySelector<HTMLElement>('[data-could]')!;
  could.hidden = !reason;
  could.textContent = reason ? `Could transfer. ${reason}` : '';
}

export function setThumb(tile: HTMLElement, src: string | undefined): void {
  const img = tile.querySelector('img')!;
  img.hidden = !src;
  if (src) img.src = src;
  else img.removeAttribute('src');
}

/** Whether the player marked it for transfer. */
export const isMarked = (tile: Element) => tile.querySelector<HTMLInputElement>('[data-transfer]')!.checked;

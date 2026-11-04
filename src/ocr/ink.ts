import type { Pixels } from './pixels';

type Kind = 'text' | 'white' | 'colour' | 'other';

// Measured on real 720 px wide screenshots. Grey labels and dark teal text are darker
// than DARK in every channel; the red "not enough Candy" cost is strongly red. Buttons
// are tinted by SATURATION or more, while the pale edges of grey letters are not.
const DARK = 180;
const RED = 80;
const WHITE = 215;
const SATURATION = 20;
// The widest white stroke of button text on a 720 px screen.
const STROKE = 16;

function kind(data: Uint8ClampedArray, at: number): Kind {
  const [r, g, b] = [data[at], data[at + 1], data[at + 2]];
  const [max, min] = [Math.max(r, g, b), Math.min(r, g, b)];
  if (max < DARK || r - Math.max(g, b) > RED) return 'text';
  if (min > WHITE) return 'white';
  return max - min >= SATURATION ? 'colour' : 'other';
}

// A run of one kind is text when it is dark or red, or when it is a narrow white stroke
// with button colour on both sides: a letter on a button, not the white card.
interface Run {
  from: number;
  to: number;
}

function isText(kinds: Kind[], run: Run, stroke: number): boolean {
  const { from, to } = run;
  if (kinds[from] === 'text') return true;
  const narrow = kinds[from] === 'white' && to - from <= stroke;
  return narrow && kinds[from - 1] === 'colour' && kinds[to] === 'colour';
}

function inkRow(px: Pixels, y: number, out: Pixels): void {
  const kinds = Array.from({ length: px.width }, (_, x) => kind(px.data, (y * px.width + x) * 4));
  const stroke = Math.round((STROKE * px.width) / 720);
  for (let from = 0, to = 0; from < px.width; from = to) {
    while (to < px.width && kinds[to] === kinds[from]) to++;
    if (isText(kinds, { from, to }, stroke)) out.data.fill(0, (y * px.width + from) * 4, (y * px.width + to) * 4);
  }
}

/**
 * The whole screen with its text black on white: dark and grey labels, red costs, and
 * white letters on coloured buttons. In the plain image, the colourful top of the screen
 * makes OCR miss the small labels and the button text.
 */
export function textInk(px: Pixels): Pixels {
  const out = { width: px.width, height: px.height, data: new Uint8ClampedArray(px.data.length).fill(255) };
  for (let y = 0; y < px.height; y++) inkRow(px, y, out);
  for (let i = 3; i < out.data.length; i += 4) out.data[i] = 255;
  return out;
}

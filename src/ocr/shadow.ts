// A Shadow Pokémon is shown on a dark indigo, starry sky (issue #13). Its appraisal and top
// screens carry no Shadow label, so the sky is the only sign there. Measured on 20 real
// screenshots: every Shadow sky averaged about (12–30, 10–22, 72–84) beside the Pokémon;
// the nearest others were Ghost-type nights (green above red), Psychic purples (red near
// 50 or more) and Electric navies (blue near 60). See docs/adr/0008.
import type { Pixels } from './pixels';

type Rgb = [number, number, number];

// Adds every other pixel of row y's left edge to the sum; gives how many were added.
function addRow(px: Pixels, y: number, sum: Rgb): number {
  let count = 0;
  for (let x = 0; x < px.width * 0.08; x += 2, count++) {
    const i = (y * px.width + x) * 4;
    sum[0] += px.data[i];
    sum[1] += px.data[i + 1];
    sum[2] += px.data[i + 2];
  }
  return count;
}

// A strip at the left edge, above the card and clear of the Pokémon.
function skyColour(px: Pixels): Rgb {
  const sum: Rgb = [0, 0, 0];
  let count = 0;
  for (let y = Math.round(px.height * 0.12); y < px.height * 0.3; y += 2) count += addRow(px, y, sum);
  return sum.map((s) => s / count) as Rgb;
}

/** Whether the sky behind the Pokémon is the Shadow one. */
export function shadowBackground(px: Pixels): boolean {
  const [r, g, b] = skyColour(px);
  return r < 36 && g < 28 && r >= g && b >= 65 && b <= 100;
}

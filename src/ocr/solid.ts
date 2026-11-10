import type { Pixels } from './pixels';

// Counts of ink (black) pixels above and left of each corner, so any square's count is four lookups.
function inkCounter(band: Pixels): (x: number, y: number, size: number) => number {
  const stride = band.width + 1;
  const sum = new Int32Array(stride * (band.height + 1));
  for (let i = 0; i < band.width * band.height; i++) {
    const [x, y] = [i % band.width, Math.floor(i / band.width)];
    const ink = band.data[i * 4] === 0 ? 1 : 0;
    sum[(y + 1) * stride + x + 1] = ink + sum[y * stride + x + 1] + sum[(y + 1) * stride + x] - sum[y * stride + x];
  }
  const at = (x: number, y: number) => sum[y * stride + x];
  return (x, y, size) => at(x + size, y + size) - at(x + size, y) - at(x, y + size) + at(x, y);
}

// Marks the square and a pixel around it, to catch its anti-aliased edge.
function markSquare(mark: Uint8Array, band: Pixels, [x, y, size]: readonly [number, number, number]): void {
  for (let row = Math.max(0, y - 1); row < Math.min(band.height, y + size + 1); row++) {
    mark.fill(1, row * band.width + Math.max(0, x - 1), row * band.width + Math.min(band.width, x + size + 1));
  }
}

/**
 * Turns white every patch of ink holding a solid square of the given size: digit strokes are
 * thinner, but a sparkle or pale sky is not. Leaves the digit parts beside the patch alone.
 */
export function eraseSolid(band: Pixels, size: number): void {
  const count = inkCounter(band);
  const mark = new Uint8Array(band.width * band.height);
  const across = band.width - size + 1;
  for (let i = 0; i < across * Math.max(0, band.height - size + 1); i++) {
    const [x, y] = [i % across, Math.floor(i / across)];
    if (count(x, y, size) === size * size) markSquare(mark, band, [x, y, size]);
  }
  for (let i = 0; i < mark.length; i++) {
    if (mark[i]) band.data.fill(255, i * 4, i * 4 + 3);
  }
}

import { describe, expect, it } from 'vitest';
import { appraisalBars, brightCpBand, cpBand } from '../../src/ocr/pixels';
import { appraisalScreen, blankScreen, drawBar, ORANGE, paint } from './fakeScreen';

describe('appraisalBars', () => {
  it('reads each IV from how far its bar is filled', () => {
    expect(appraisalBars(appraisalScreen([12, 13, 15]))).toEqual({ atk: 12, def: 13, hp: 15 });
  });

  it('reads empty and full bars', () => {
    expect(appraisalBars(appraisalScreen([0, 15, 1]))).toEqual({ atk: 0, def: 15, hp: 1 });
  });

  it('ignores taller blocks of bar colour above the appraisal', () => {
    const px = appraisalScreen([10, 13, 14]);
    for (let y = 974; y < 1024; y++) drawBar(px, y, 7);
    expect(appraisalBars(px)).toEqual({ atk: 10, def: 13, hp: 14 });
  });

  it('finds nothing on a screen without three bars', () => {
    const px = blankScreen();
    drawBar(px, 1245, 12);
    expect(appraisalBars(px)).toBeUndefined();
  });
});

describe('cpBand', () => {
  it('crops the top band and keeps only white text, as black on white', () => {
    const px = blankScreen();
    px.data.fill(0);
    paint(px, [360, 110], [255, 255, 255]);
    paint(px, [361, 110], ORANGE);
    const band = cpBand(px);
    const at = (x: number, y: number) => band.data[(y * band.width + x) * 4];
    const [left, top] = [Math.round(720 * 0.15), Math.round(720 * 0.05)];
    expect([band.width, band.height]).toEqual([Math.round(720 * 0.7), Math.round(720 * 0.2)]);
    expect([at(360 - left, 110 - top), at(361 - left, 110 - top), at(0, 0)]).toEqual([0, 255, 255]);
  });

  // A bright background beside the CP threw OCR off (fix C2 of the 2026-11-04 stress test).
  it('leaves out white patches too big to be digits', () => {
    const px = blankScreen();
    px.data.fill(0);
    for (let y = 100; y < 200; y++) for (let x = 500; x < 600; x++) paint(px, [x, y], [255, 255, 255]);
    const band = cpBand(px);
    expect(band.data[((150 - Math.round(720 * 0.05)) * band.width + 550 - Math.round(720 * 0.15)) * 4]).toBe(255);
  });
});

// White CP digits on a pale sky, or touching a bright sparkle, are lost in the first band (issue #5).
describe('brightCpBand', () => {
  const [left, top] = [Math.round(720 * 0.15), Math.round(720 * 0.05)];
  const inkAt = (band: ReturnType<typeof cpBand>, x: number, y: number) => band.data[((y - top) * band.width + x - left) * 4] === 0;
  const fill = (px: ReturnType<typeof blankScreen>, [x0, y0, x1, y1]: number[], rgb: number[]) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) paint(px, [x, y], rgb);
  };

  it('keeps only the brightest white, leaving out pale sky', () => {
    const px = blankScreen();
    px.data.fill(0);
    paint(px, [300, 100], [255, 255, 255]);
    paint(px, [301, 100], [230, 238, 250]);
    const band = brightCpBand(px);
    expect([inkAt(band, 300, 100), inkAt(band, 301, 100)]).toEqual([true, false]);
  });

  it('cuts away a solid sparkle a digit touches, keeping the digit’s stroke', () => {
    const px = blankScreen();
    px.data.fill(0);
    fill(px, [300, 80, 305, 120], [255, 255, 255]);
    fill(px, [240, 100, 300, 150], [255, 255, 255]);
    const band = brightCpBand(px);
    expect([inkAt(band, 302, 90), inkAt(band, 270, 125)]).toEqual([true, false]);
  });
});

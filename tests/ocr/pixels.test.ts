import { describe, expect, it } from 'vitest';
import { appraisalBars, cpBand } from '../../src/ocr/pixels';
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
});

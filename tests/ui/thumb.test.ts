import { describe, expect, it } from 'vitest';
import { cropBox, pickShot } from '../../src/ui/thumb';

describe('cropBox', () => {
  it('keeps the top of the screenshot only, scaled to a small width', () => {
    expect(cropBox(1080, 2400)).toEqual({ sw: 1080, sh: 1080, width: 160, height: 160 });
    expect(cropBox(1000, 1000)).toEqual({ sw: 1000, sh: 450, width: 160, height: 72 });
  });
});

describe('pickShot', () => {
  const group = { reading: { cp: 900, hp: 120 }, conflicts: [], shots: 2 };

  it('picks the first screenshot showing this Pokémon’s CP', () => {
    expect(pickShot([{ cp: 500 }, { dust: 2500 }, { cp: 900, hp: 120 }, { cp: 900 }], group)).toBe(2);
  });

  it('picks none when no screenshot shows its CP', () => {
    expect(pickShot([{ cp: 900, hp: 99 }, { dust: 2500 }], group)).toBeUndefined();
    expect(pickShot([{ dust: 2500 }], { ...group, reading: {} })).toBeUndefined();
  });

  it('picks by HP, with matching IVs, when the CP was hidden', () => {
    const ivs = { atk: 14, def: 12, hp: 15 };
    const hidden = { ...group, reading: { hp: 115, ivs } };
    expect(pickShot([{ hp: 115, ivs: { ...ivs, atk: 0 } }, { dust: 2500 }, { hp: 115, ivs }], hidden)).toBe(2);
    expect(pickShot([{ hp: 99, ivs }], hidden)).toBeUndefined();
  });
});

describe('makeThumb', () => {
  it('gives no thumbnail when the browser cannot draw the image', async () => {
    const { makeThumb } = await import('../../src/ui/thumb');
    expect(await makeThumb(new Blob(['not an image']))).toBeUndefined();
  });
});

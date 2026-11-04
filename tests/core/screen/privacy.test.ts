import { describe, expect, it } from 'vitest';
import { textLines } from '../../../src/core/screen/anchors';
import { dropLocation } from '../../../src/core/screen/privacy';
import { wordsOf } from './wordsOf';

// Place names here are made up.
const kept = (text: string) => textLines(dropLocation(wordsOf(text)));

describe('dropLocation', () => {
  it('drops the place and date lines under an origin label, keeping the label', () => {
    const screen = 'GYMS & RAIDS\nCAUGHT IN THE WILD\nSpringfield, Exampleland\n1/2/2026\nWEIGHT';
    expect(kept(screen)).toEqual(['GYMS & RAIDS', 'CAUGHT IN THE WILD', 'WEIGHT']);
  });

  it('drops at most three lines when no date follows the label', () => {
    const screen = 'HATCHED FROM AN EGG\nSpringfield\nExampleland\nNowhere\nPOWER UP 9,000 12';
    expect(kept(screen)).toEqual(['HATCHED FROM AN EGG', 'POWER UP 9,000 12']);
  });

  it('drops the place from the appraisal footer, including a wrapped line', () => {
    const screen = 'This Snorlax was caught on 1/2/2026 around Springfield,\nExampleland.';
    expect(kept(screen)).toEqual(['This Snorlax was caught on 1/2/2026']);
  });

  it('leaves a screen without location untouched', () => {
    const words = wordsOf('CP 1499\nPOWER UP 9,000 12');
    expect(dropLocation(words)).toEqual(words);
  });
});

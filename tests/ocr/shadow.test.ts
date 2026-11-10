import { describe, expect, it } from 'vitest';
import { shadowBackground } from '../../src/ocr/shadow';
import { blankScreen, skyScreen as sky } from './fakeScreen';

// Issue #13. Colours measured above the card on real screenshots: the Shadow sky is the same
// dark indigo for every Shadow Pokémon; Ghost and Psychic skies are near it but not it.
describe('the Shadow sky', () => {
  it('is seen behind a Shadow Pokémon', () => {
    expect(shadowBackground(sky([16, 12, 77]))).toBe(true);
    expect(shadowBackground(sky([28, 21, 84]))).toBe(true);
  });

  it('is not a Ghost-type night, a Psychic purple, an Electric navy or a white screen', () => {
    expect(shadowBackground(sky([9, 41, 83]))).toBe(false);
    expect(shadowBackground(sky([54, 48, 120]))).toBe(false);
    expect(shadowBackground(sky([2, 26, 60]))).toBe(false);
    expect(shadowBackground(blankScreen())).toBe(false);
  });
});

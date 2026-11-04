import { describe, expect, it } from 'vitest';
import { classify } from '../../../src/core/screen/classify';
import { wordsOf } from './wordsOf';

describe('classify', () => {
  it('knows the Pokémon screen by its POWER UP button', () => {
    expect(classify(wordsOf('STARDUST CANDY\nPOWER UP 9,000 12'))).toEqual(['pokemon']);
  });

  it('knows the Pokémon screen by its HP when a popup covers the buttons', () => {
    expect(classify(wordsOf('Snorlax\n132/132HP'))).toEqual(['pokemon']);
  });

  it('knows the Pokémon screen by its move tabs when OCR misses POWER UP', () => {
    expect(classify(wordsOf('ARON CANDY XL\nGYMS & RAIDS TRAINER BATTLES\nMetal Sound 4'))).toEqual(['pokemon']);
    expect(classify(wordsOf('TRAINER BATTLES\nTackle'))).toEqual(['pokemon']);
    expect(classify(wordsOf('GYMS & RAIDS\nTackle'))).toEqual(['pokemon']);
  });

  it('knows the appraisal screen by its footer, together with what stays visible', () => {
    const words = wordsOf('Snorlax\n132 / 132 HP\nThis Snorlax was caught on 1/2/2026');
    expect(classify(words)).toEqual(['pokemon', 'appraisal']);
  });

  it('knows the item bag and the trainer profile', () => {
    expect(classify(wordsOf('ITEMS\nOTHER ITEMS\nRare Candy x51'))).toEqual(['bag']);
    expect(classify(wordsOf('LEVEL\nTOTAL ACTIVITY'))).toEqual(['profile']);
  });

  it('returns nothing for a screen it does not know', () => {
    expect(classify(wordsOf('Settings\nVersion 0.321.0'))).toEqual([]);
  });
});

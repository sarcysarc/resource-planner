import { describe, expect, it } from 'vitest';
import { readScan } from '../../../src/core/screen/read';
import { wordsOf } from './wordsOf';

const normal = { variant: 'normal', lucky: false } as const;

describe('readScan', () => {
  it('reads the Pokémon screen', () => {
    const scan = { words: wordsOf('Snorlax\n132 / 132 HP\nPOWER UP 9,000 12'), cpText: '2251', digits: {} };
    expect(readScan(scan, normal)).toEqual({ cp: 2251, hp: 132, dust: 9000 });
  });

  it('adds appraisal IVs', () => {
    const scan = { words: wordsOf('This Snorlax was caught on 1/2/2026'), cpText: '', digits: {}, ivs: { atk: 1, def: 2, hp: 3 } };
    expect(readScan(scan, normal)).toEqual({ ivs: { atk: 1, def: 2, hp: 3 } });
  });

  it('ignores numbers on a screen it does not know', () => {
    expect(readScan({ words: wordsOf('Settings'), cpText: '1499', digits: {} }, normal)).toEqual({});
  });
});

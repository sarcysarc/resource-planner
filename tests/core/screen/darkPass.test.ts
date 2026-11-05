import { describe, expect, it } from 'vitest';
import { needsDarkPass } from '../../../src/core/screen/darkPass';
import { wordsOf } from './wordsOf';

// Made-up screens, as the plain pass might read them.
const APPRAISAL = wordsOf('Riolu\n79 / 79 HP');
const TOP = wordsOf('Lairon\n80 / 80 HP\nPOWER UP');

describe('needsDarkPass', () => {
  it('skips the dark pass on an appraisal whose name and HP the plain pass read', () => {
    expect(needsDarkPass(APPRAISAL, true)).toBe(false);
  });

  it('runs it on an appraisal missing its name or HP', () => {
    expect(needsDarkPass(wordsOf('Riolu\nHP'), true)).toBe(true);
    expect(needsDarkPass(wordsOf('79 / 79 HP'), true)).toBe(true);
  });

  // Its small grey labels hold the family, the totals and the costs.
  it('runs it on a Pokémon screen without IV bars, whatever the plain pass read', () => {
    expect(needsDarkPass(TOP, false)).toBe(true);
  });

  it('runs it on the bag and the profile', () => {
    expect(needsDarkPass(wordsOf('OTHER ITEMS'), false)).toBe(true);
    expect(needsDarkPass(wordsOf('LEVEL\nTOTAL ACTIVITY'), false)).toBe(true);
  });

  it('skips it on a screen the plain pass shows is none of those', () => {
    expect(needsDarkPass(wordsOf('SETTINGS\nMusic'), false)).toBe(false);
    expect(needsDarkPass([], false)).toBe(false);
  });
});

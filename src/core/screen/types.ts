import type { IVs, Modifiers } from '../types';

/** A rectangle as fractions of the image width (so y can exceed 1 on tall screens). */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** One OCR word. `line` numbers the OCR lines from the top of the screenshot. */
export interface Word {
  text: string;
  box: Box;
  line: number;
  // Tesseract's confidence in the word, 0-100.
  conf?: number;
}

export type ScreenKind = 'pokemon' | 'appraisal' | 'bag' | 'profile';

/**
 * Text colour to keep when re-reading a region: white on buttons, dark teal for labels,
 * teal or red for a button's cost (red when there is not enough), and any strong colour
 * for the trainer level, which takes the team's colour.
 */
export type Ink = 'white' | 'teal' | 'cost' | 'colour';

/** An area to read again, digits only, after the first pass found its label. */
export interface Region {
  box: Box;
  ink: Ink;
}

/** The account's resource totals, named as the form's resource fields. */
export type TotalName = 'stardust' | 'candy' | 'xl';
/** Account-wide values from the bag and the profile, also named as form fields. */
export type AccountName = 'rareCandy' | 'rareXl' | 'trainerLevel';
export type Totals = Partial<Record<TotalName | AccountName, number>>;

export type RegionName = 'cost' | 'evolve' | TotalName | 'trainerLevel';

/** What OCR produced for one screenshot. Location text is already removed. */
export interface Scan {
  words: Word[];
  cpText: string;
  /** The CP band read again keeping only the purest white, for a CP on a pale sky (issue #5). */
  cpBright?: string;
  digits: Partial<Record<RegionName, string>>;
  ivs?: IVs;
  /** The Shadow sky shows behind the Pokémon (issue #13). */
  shadow?: true;
}

/** What the screen says about the Pokémon besides its numbers. Names are as printed. */
export interface Details {
  name?: string;
  family?: string;
  variant?: Modifiers['variant'];
  lucky?: true;
  secondMove?: boolean;
  evolveCandy?: number;
}

/** Values read off a screenshot; each is missing when it could not be found. */
export interface Reading extends Details {
  cp?: number;
  /** Other CPs the CP band could be read as, until the species settles which (fix C). */
  cpOptions?: number[];
  /** A CP read that fits no level and IVs of the species with the HP read; left out (fix C). */
  cpDoubt?: number;
  hp?: number;
  dust?: number;
  ivs?: IVs;
  totals?: Totals;
}

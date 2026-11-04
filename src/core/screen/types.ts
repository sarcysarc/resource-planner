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
}

export type ScreenKind = 'pokemon' | 'appraisal' | 'bag' | 'profile';

/** Text colour to keep when re-reading a region: white on buttons, dark teal for labels. */
export type Ink = 'white' | 'teal';

/** An area to read again, digits only, after the first pass found its label. */
export interface Region {
  box: Box;
  ink: Ink;
}

export type RegionName = 'cost';

/** What OCR produced for one screenshot. Location text is already removed. */
export interface Scan {
  words: Word[];
  cpText: string;
  digits: Partial<Record<RegionName, string>>;
  ivs?: IVs;
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
  hp?: number;
  dust?: number;
  ivs?: IVs;
}

import { HP } from './classify';

// "This Snorlax was caught on …" at the foot of the appraisal. OCR can run the name into "was".
const FOOTER = /\bThis\s+(.+?)\s*was\s+caught\b/;
// A name: capitalised words, allowing "Mr. Mime", "Farfetch'd" and "Ho-Oh".
// At least three characters, so a scrap of junk is not taken for a name.
const NAME = /[A-Z][\w'.\-♀♂]{2,}(?: [A-Z][\w'.\-♀♂]*)*/;
// "STARDUST ARON CANDY": the word before CANDY names the family.
const FAMILY = /\b([A-Z][A-Z'.-]+)\s+CANDY\b/;
const NOT_FAMILY = new Set(['RARE', 'XL', 'CANDY']);
// "STARDUST", or the end of it when the start is cut off ("ARDUST").
const DUST = /DUST$/;
// On the bottom screen the label can wrap, the family on the line above "CANDY".
const WRAPPED = /^CANDY\b/;
const LAST_WORD = /([A-Z][A-Z'.-]+)\s*$/;

/** The species from the appraisal footer, else the name over the HP line (maybe a nickname). */
export function readName(lines: string[]): string | undefined {
  const footer = lines.map((line) => FOOTER.exec(line)).find(Boolean);
  if (footer) return footer[1];
  const hp = lines.findIndex((line) => HP.test(line));
  // The rename pencil beside the name can be read as a line of its own, between it and HP.
  return lines.slice(Math.max(0, hp - 2), Math.max(0, hp)).reverse().map((line) => NAME.exec(line)?.[0]).find(Boolean);
}

const familiesIn = (line: string, above = '') => [FAMILY.exec(line)?.[1], WRAPPED.test(line) ? LAST_WORD.exec(above)?.[1] : undefined];
const isFamily = (name: string | undefined): name is string => name !== undefined && !NOT_FAMILY.has(name) && !DUST.test(name);

/** The Candy family as printed ("ARON"), which identifies the line even under a nickname. */
export function readFamily(lines: string[]): string | undefined {
  return lines.flatMap((line, i) => familiesIn(line, lines[i - 1])).find(isFamily);
}

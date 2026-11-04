import { HP } from './classify';

// "This Snorlax was caught on …" at the foot of the appraisal.
const FOOTER = /\bThis\s+(.+?)\s+was\s+caught\b/;
// A name: capitalised words, allowing "Mr. Mime", "Farfetch'd" and "Ho-Oh".
// At least three characters, so a scrap of junk is not taken for a name.
const NAME = /[A-Z][\w'.\-♀♂]{2,}(?: [A-Z][\w'.\-♀♂]*)*/;
// "STARDUST ARON CANDY": the word before CANDY names the family.
const FAMILY = /\b([A-Z][A-Z'.-]+)\s+CANDY\b/;
const NOT_FAMILY = new Set(['RARE', 'XL', 'CANDY', 'STARDUST']);

/** The species from the appraisal footer, else the name over the HP line (maybe a nickname). */
export function readName(lines: string[]): string | undefined {
  const footer = lines.map((line) => FOOTER.exec(line)).find(Boolean);
  if (footer) return footer[1];
  const hp = lines.findIndex((line) => HP.test(line));
  return hp > 0 ? NAME.exec(lines[hp - 1])?.[0] : undefined;
}

/** The Candy family as printed ("ARON"), which identifies the line even under a nickname. */
export function readFamily(lines: string[]): string | undefined {
  return lines
    .map((line) => FAMILY.exec(line)?.[1])
    .find((name) => name !== undefined && !NOT_FAMILY.has(name));
}

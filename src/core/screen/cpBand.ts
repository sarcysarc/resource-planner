// The CP from the cropped CP band (see `cpBand` in src/ocr/pixels.ts), and the other ways
// OCR's text could be read, for when the species shows the first reading is wrong (fix C).

// OCR often reads the small CP letters as "cpr" or "cr".
export const CP = /C[PR]{1,2}\s*(\d{2,5})/i;

// No CP reaches five digits.
const MAX_CP = 9999;

/**
 * CP from the cropped CP band: the number after the CP label, else the first number in it.
 * The band holds no slash, but OCR reads the large 7 as one, so a slash before a digit is a
 * 7, unless that gives an impossible CP: then it was glare ("cp137/8" for 1378). A CP label
 * broken into another word ("Chk. 24") lost the first digits with it.
 */
export function readCp(bandText: string): number | undefined {
  const asSeven = bandCp(bandText.replace(/\/(?=\d)/g, '7'));
  return asSeven !== undefined && asSeven > MAX_CP ? bandCp(bandText.replace(/\/(?=\d)/g, '')) : asSeven;
}

function bandCp(text: string): number | undefined {
  if (!CP.test(text) && /\bC\S+\s+\d/i.test(text)) return undefined;
  // A Lucky's gold background can add junk digits above the label.
  const digits = CP.exec(text)?.[1] ?? /\d{2,5}/.exec(text)?.[0];
  return digits === undefined ? undefined : Number(digits);
}

// Letters OCR gives for the large CP digits on a busy background: "crl161" for 1161,
// "crb7/" for 67. Only one beside a digit, a space apart at most, is taken for one.
const LOOKS: Record<string, string> = { l: '1', I: '1', i: '1', '|': '1', '!': '1', b: '6', O: '0', o: '0', D: '0', S: '5', s: '5', B: '8', Z: '2', z: '2', g: '9', q: '9' };
const NEAR_DIGIT = /[lIi|!bOoDSsBZzgq](?= ?\d)|(?<=\d ?)[lIi|!bOoDSsBZzgq]/g;

/**
 * The CPs the band could also be read as: with digit-like letters as digits, and with
 * digits a space split joined up. Not the reading `readCp` gives; none above 9999.
 */
export function cpOptions(bandText: string): number[] {
  const asDigits = bandText.replace(NEAR_DIGIT, (c) => LOOKS[c]);
  const joined = asDigits.replace(/(\d) (?=\d)/g, '$1');
  const first = readCp(bandText);
  const all = [readCp(asDigits), readCp(joined)].filter((cp): cp is number => cp !== undefined && cp !== first && cp <= MAX_CP);
  return [...new Set(all)];
}

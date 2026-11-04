// Writes what the site reads from every saved scan to screenshots/stress/draft.json, as a
// starting point for the answer key (ADR 0016). Each value still has to be checked by eye.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'vitest';
import { classify } from '../src/core/screen/classify';
import { readScan } from '../src/core/screen/read';
import type { Saved } from './truth';

const DIR = join('screenshots', 'stress', 'scans');
const saved = (): Saved[] => readdirSync(DIR).map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Saved);

function draft({ name, ms, scan, error }: Saved) {
  if (!scan) return { name, ms, error };
  const { cp, hp, ivs, variant, lucky, family, name: read } = readScan(scan, { variant: 'normal', lucky: false });
  return { name, ms, kinds: classify(scan.words), read, cp, hp, ivs: ivs && [ivs.atk, ivs.def, ivs.hp], variant, lucky, family };
}

it('drafts the answer key from the saved scans', () => {
  writeFileSync(join('screenshots', 'stress', 'draft.json'), JSON.stringify(saved().map(draft), null, 1));
});

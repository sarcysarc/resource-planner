// Every real screenshot in the answer key, through the site's own reading (ADR 0016).
// Run with: npx vitest run --config stress/vitest.config.ts
import { writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { readScan } from '../src/core/screen/read';
import { compareShot, type Miss } from './compare';
import { loadScan, loadTruth } from './truth';

const truth = loadTruth();
const shots = Object.entries(truth?.shots ?? {});
const misses: Miss[] = [];
const AS_SEEN = { variant: 'normal', lucky: false } as const;

describe.skipIf(!truth)('reading each screenshot', () => {
  it.each(shots)('%s', (name, want) => {
    const saved = loadScan(name);
    expect(saved?.scan, 'no saved scan; open /stress/scan.html').toBeDefined();
    const found = compareShot(name, want, readScan(saved!.scan!, AS_SEEN));
    misses.push(...found);
    expect(found).toEqual([]);
  });

  afterAll(() => writeFileSync('screenshots/stress/read-misses.json', JSON.stringify(misses, null, 1)));
});

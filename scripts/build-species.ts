// Builds src/data/species.json from PvPoke's game master (MIT licensed), ADR 0005.
// Usage: npm run update-data [-- path-to-gamemaster.json]
// With no path, downloads the latest copy from GitHub. Node runs this file directly
// (type stripping); the transform and schema live in src/data/pvpoke.ts.
import { readFile, writeFile } from 'node:fs/promises';
import { toSpeciesFile } from '../src/data/pvpoke.ts';

const SOURCE_URL = 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json';
const OUT_PATH = new URL('../src/data/species.json', import.meta.url);

async function loadGameMaster(path: string | undefined): Promise<unknown> {
  if (path) return JSON.parse(await readFile(path, 'utf8'));
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return res.json();
}

const file = toSpeciesFile(await loadGameMaster(process.argv[2]), SOURCE_URL);
await writeFile(OUT_PATH, JSON.stringify(file) + '\n');
console.log(`Wrote ${file.species.length} species (game master ${file.timestamp})`);

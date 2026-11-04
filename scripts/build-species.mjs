// Builds src/data/species.json from PvPoke's game master (MIT licensed).
// Usage: node scripts/build-species.mjs [path-to-gamemaster.json]
// With no path, downloads the latest copy from GitHub.
import { readFile, writeFile } from 'node:fs/promises';

const SOURCE_URL = 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json';
const OUT_PATH = new URL('../src/data/species.json', import.meta.url);

async function loadGameMaster(path) {
  if (path) return JSON.parse(await readFile(path, 'utf8'));
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return res.json();
}

function isUsable(p) {
  const tags = p.tags ?? [];
  return p.released !== false && !tags.includes('shadow') && !tags.includes('mega');
}

function slim(p) {
  return {
    id: p.speciesId,
    name: p.speciesName,
    dex: p.dex,
    base: p.baseStats,
    family: p.family?.id ?? p.speciesId,
    parent: p.family?.parent ?? null,
    // false in the source means the species cannot unlock a second charged move
    secondMoveDust: typeof p.thirdMoveCost === "number" ? p.thirdMoveCost : null,
  };
}

const gm = await loadGameMaster(process.argv[2]);
const species = gm.pokemon.filter(isUsable).map(slim);
const out = { source: SOURCE_URL, timestamp: gm.timestamp, species };
await writeFile(OUT_PATH, JSON.stringify(out) + '\n');
console.log(`Wrote ${species.length} species (game master ${gm.timestamp})`);

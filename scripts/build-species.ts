// Builds src/data/species.json and src/data/moves.json (ADR 0005, 0007).
// Species, move lists and PvP move stats come from PvPoke's game master (MIT); PvE
// move stats from PokeMiners' game master, credited in the app.
// Usage: npm run update-data [-- pvpoke-gamemaster.json [pokeminers-latest.json]]
// With no paths, downloads the latest copies. PVE_SOURCE_URL switches the PvE source
// to a mirror in the same format (credit it in the app if you do).
// Node runs this file directly (type stripping); the transforms and schemas live in
// src/data/pvpoke.ts and src/data/moves.ts.
import { readFile, writeFile } from 'node:fs/promises';
import { toMovesFile } from '../src/data/moves.ts';
import { toSpeciesFile } from '../src/data/pvpoke.ts';

const PVP_URL = 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json';
const PVE_URL = process.env.PVE_SOURCE_URL
  ?? 'https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json';
const out = (name: string) => new URL(`../src/data/${name}`, import.meta.url);

async function load(path: string | undefined, url: string): Promise<unknown> {
  if (path) return JSON.parse(await readFile(path, 'utf8'));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  return res.json();
}

const pvp = await load(process.argv[2], PVP_URL);
const pve = await load(process.argv[3], PVE_URL);
const species = toSpeciesFile(pvp, PVP_URL);
const moves = toMovesFile({ pvp, pve, sources: { pvp: PVP_URL, pve: PVE_URL } });
await writeFile(out('species.json'), JSON.stringify(species) + '\n');
await writeFile(out('moves.json'), JSON.stringify(moves) + '\n');
const unknown = moves.moves.filter((m) => m.pve === null).length;
console.log(`Wrote ${species.species.length} species and ${moves.moves.length} moves`
  + ` (${unknown} without PvE stats; game master ${species.timestamp})`);

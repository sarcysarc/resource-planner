// The Pokémon GO type chart (ADR 0007): public game mechanics, kept as our own table.
// For each attacking type: the types it hits for 1.6, for 0.625 and for 0.390625.

export const TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const;

interface Matchups {
  strong: string[];
  weak: string[];
  immune: string[];
}

const m = (strong: string, weak: string, immune = ''): Matchups => ({
  strong: strong.split(' ').filter(Boolean),
  weak: weak.split(' ').filter(Boolean),
  immune: immune.split(' ').filter(Boolean),
});

const CHART: Record<string, Matchups> = {
  normal: m('', 'rock steel', 'ghost'),
  fire: m('grass ice bug steel', 'fire water rock dragon'),
  water: m('fire ground rock', 'water grass dragon'),
  electric: m('water flying', 'electric grass dragon', 'ground'),
  grass: m('water ground rock', 'fire grass poison flying bug dragon steel'),
  ice: m('grass ground flying dragon', 'fire water ice steel'),
  fighting: m('normal ice rock dark steel', 'poison flying psychic bug fairy', 'ghost'),
  poison: m('grass fairy', 'poison ground rock ghost', 'steel'),
  ground: m('fire electric poison rock steel', 'grass bug', 'flying'),
  flying: m('grass fighting bug', 'electric rock steel'),
  psychic: m('fighting poison', 'psychic steel', 'dark'),
  bug: m('grass psychic dark', 'fire fighting poison flying ghost steel fairy'),
  rock: m('fire ice flying bug', 'fighting ground steel'),
  ghost: m('psychic ghost', 'dark', 'normal'),
  dragon: m('dragon', 'steel', 'fairy'),
  dark: m('psychic ghost', 'fighting dark fairy'),
  steel: m('ice rock fairy', 'fire water electric steel'),
  fairy: m('fighting dragon dark', 'fire poison steel'),
};

export const SUPER_EFFECTIVE = 1.6;
export const NOT_VERY_EFFECTIVE = 0.625;
export const IMMUNE = 0.390625;

function single(chart: Matchups, defender: string): number {
  if (chart.strong.includes(defender)) return SUPER_EFFECTIVE;
  if (chart.weak.includes(defender)) return NOT_VERY_EFFECTIVE;
  return chart.immune.includes(defender) ? IMMUNE : 1;
}

/** The multiplier for a move of `moveType` hitting a Pokémon of `defenderTypes`. */
export function effectiveness(moveType: string, defenderTypes: readonly string[]): number {
  const chart = CHART[moveType];
  if (!chart) return 1;
  return defenderTypes.reduce((product, t) => product * single(chart, t), 1);
}

import { MAX_TRAINER_LEVEL } from '../levels';
import { above, norm, union } from './anchors';
import type { Box, Reading, Region, Totals, Word } from './types';

// The bag's count badge: "x51", sometimes read without its x.
const BADGE = /^[x×]?(\d{1,3}(,\d{3})*)$/i;
// The badge sits below-left of the item name, within this many name heights.
const BADGE_REACH = 6;

type RareName = 'rareCandy' | 'rareXl';

const sameLine = (words: Word[], at: number, token: string) =>
  words[at]?.line === words[at - 1]?.line && norm(words[at].text) === token;

// "Rare Candy" and "Rare Candy XL" item names, by which item they are.
function rareNames(words: Word[]): [RareName, Box][] {
  const names: [RareName, Box][] = [];
  words.forEach((w, at) => {
    if (norm(w.text) !== 'RARE' || !sameLine(words, at + 1, 'CANDY')) return;
    const xl = sameLine(words, at + 2, 'XL');
    const box = union(w.box, words[at + (xl ? 2 : 1)].box);
    names.push([xl ? 'rareXl' : 'rareCandy', box]);
  });
  return names;
}

// The nearest badge left of the name and below it (icon junk can sit on the name line),
// before the next item starts.
function badge(words: Word[], name: Box): number | undefined {
  const reach = name.y0 + BADGE_REACH * (name.y1 - name.y0);
  const below = words.filter(({ box, text }) => BADGE.test(text) && box.x1 <= name.x0 && box.y0 > name.y1 && box.y0 < reach);
  const nearest = below.sort((a, b) => a.box.y0 - b.box.y0)[0];
  return nearest && Number(BADGE.exec(nearest.text)![1].replaceAll(',', ''));
}

/** Rare Candy and Rare Candy XL counts from the item bag, found by their names. */
export function readBag(words: Word[]): Totals {
  const totals: Totals = {};
  for (const [name, box] of rareNames(words)) {
    const count = badge(words, box);
    if (count !== undefined) totals[name] ??= count;
  }
  return totals;
}

/**
 * Where the trainer level sits on the profile: the big number above "LEVEL". Only the
 * capitalised label counts; "level" in running text, such as the rewards banner, does not.
 */
export function levelRegion(words: Word[]): Region | undefined {
  const label = words.find((w) => w.text === 'LEVEL');
  return label && { box: above(label.box), ink: 'colour' };
}

/** The trainer level from the second-pass digits, when it is a level a trainer can have. */
export function readTrainerLevel(text: string | undefined): number | undefined {
  const level = Number(text?.match(/\d+/)?.[0]);
  return level >= 1 && level <= MAX_TRAINER_LEVEL ? level : undefined;
}

// Bag and profile readings carry nothing but account-wide totals.
const isAccount = (r: Reading) => r.totals !== undefined && Object.keys(r).length === 1 && !r.totals.candy && !r.totals.xl;

/**
 * Takes the bag and profile screenshots out, so only Pokémon are grouped. Their values
 * are merged oldest first, so the newest wins.
 */
export function splitAccount(readings: Reading[]): { pokemon: Reading[]; account: Totals } {
  const pokemon = readings.filter((r) => !isAccount(r));
  const account: Totals = Object.assign({}, ...readings.filter(isAccount).map((r) => r.totals));
  return { pokemon, account };
}

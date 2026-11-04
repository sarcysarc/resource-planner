import { splitAccount } from '../core/screen/account';
import { type FamilyOf, type Group, groupReadings } from '../core/screen/merge';
import type { Totals } from '../core/screen/types';
import { failedNote, progressNote, readImages } from './readImages';

export type Side = 'current' | 'alternative';

export interface ShotsWiring {
  /** The `[data-shots]` section with the shared picker. */
  root: ParentNode;
  familyOf: FamilyOf;
  /** Fills one candidate from one Pokémon's screenshots. */
  use: (side: Side, group: Group) => void;
  /** Fills the account values a bag or profile screenshot showed; returns a status note. */
  useAccount: (totals: Totals) => string;
}

const NONE = 'No Pokémon found in these screenshots. Use the Pokémon or appraisal screen.';
const q = <T extends Element>(root: ParentNode, selector: string) => root.querySelector<T>(selector)!;
const setStatus = (w: ShotsWiring, text: string) => (q(w.root, '[data-shots-status]').textContent = text);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const capitalise = (word: string) => word.charAt(0) + word.slice(1).toLowerCase();

function label({ reading }: Group): string {
  const name = reading.name ?? (reading.family ? capitalise(reading.family) : 'Unknown Pokémon');
  return reading.cp === undefined ? name : `${name}, CP ${reading.cp}`;
}

function offerChoice(w: ShotsWiring, groups: Group[]): void {
  ['pickCurrent', 'pickAlternative'].forEach((name, i) => {
    const select = q<HTMLSelectElement>(w.root, `[name="${name}"]`);
    select.replaceChildren(...groups.map((g, at) => new Option(label(g), String(at))));
    select.value = String(i);
  });
  q<HTMLElement>(w.root, '[data-shots-choice]').hidden = false;
}

function pickTwo(w: ShotsWiring, groups: Group[]): void {
  const [current, alternative] = ['pickCurrent', 'pickAlternative'].map((n) => Number(q<HTMLSelectElement>(w.root, `[name="${n}"]`).value));
  if (current === alternative) {
    setStatus(w, 'Pick two different Pokémon.');
    return;
  }
  q<HTMLElement>(w.root, '[data-shots-choice]').hidden = true;
  w.use('current', groups[current]);
  w.use('alternative', groups[alternative]);
}

// Bag and profile screenshots count as read even when no Pokémon is found.
function readNote(files: number, groups: Group[], accountNote: string): string {
  const shots = `Read ${plural(files, 'screenshot')}`;
  if (!groups.length) return accountNote ? `${shots}.${accountNote}` : NONE;
  const more = groups.length > 2 ? ' Pick the two to compare.' : '';
  return `${shots}: ${groups.length} Pokémon.${more}${accountNote}`;
}

async function readAll(w: ShotsWiring, files: File[]): Promise<Group[]> {
  q<HTMLElement>(w.root, '[data-shots-choice]').hidden = true;
  setStatus(w, progressNote(1, files.length));
  const progress = (n: number) => setStatus(w, progressNote(n, files.length));
  const { readings, failed } = await readImages(files, { variant: 'normal', lucky: false }, progress);
  const { pokemon, account } = splitAccount(readings);
  const groups = groupReadings(pokemon, w.familyOf);
  const accountNote = Object.keys(account).length ? ` ${w.useAccount(account)}` : '';
  setStatus(w, readNote(files.length, groups, accountNote) + failedNote(failed));
  if (groups.length > 2) offerChoice(w, groups);
  else groups.forEach((group, i) => w.use(i ? 'alternative' : 'current', group));
  return groups;
}

/**
 * Hooks up the shared picker: screenshots of several Pokémon, sorted into Pokémon.
 * Two go straight into Current and Alternative; with more, the player picks two.
 * Returns a function that reads files from elsewhere, such as a share.
 */
export function wireScreenshots(w: ShotsWiring): (files: File[]) => void {
  let groups: Group[] = [];
  const read = (files: File[]) => {
    if (files.length) void readAll(w, files).then((found) => (groups = found), () => setStatus(w, 'Could not read those images. Try again.'));
  };
  const input = q<HTMLInputElement>(w.root, '[name="screenshots"]');
  input.addEventListener('change', () => read([...(input.files ?? [])]));
  q(w.root, '[data-shots-use]').addEventListener('click', () => pickTwo(w, groups));
  return read;
}

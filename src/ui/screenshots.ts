// Step 1's picker (ADR 0015): screenshots of many Pokémon, sorted into Pokémon. Anything
// the screenshots can't settle is asked first; then each Pokémon goes into the grid.
import { splitAccount } from '../core/screen/account';
import { groupReadings } from '../core/screen/group';
import type { FamilyOf, Group } from '../core/screen/merge';
import type { Reading, Totals } from '../core/screen/types';
import { type Fresh, freshFiles, skippedNote } from './fingerprint';
import { type KnownTile, poweredQuestions } from './poweredUp';
import { answer, questionsFor, type StagesOf } from './questions';
import { askQuestions } from './questionsView';
import { failedNote, progressNote, readImages } from './readImages';
import { pickShot } from './thumb';

export interface ShotsWiring {
  /** The `[data-shots]` section with the picker and `[data-questions]`. */
  root: ParentNode;
  familyOf: FamilyOf;
  stagesOf: StagesOf;
  /**
   * Puts one Pokémon into the grid; `shot` is a screenshot of it for its thumbnail, `prints`
   * the fingerprints of every screenshot it was read from.
   */
  use: (group: Group, shot?: File, prints?: string[]) => void | Promise<void>;
  /** The tiles already in every line, to ask about one read again at another CP. */
  known?: () => readonly KnownTile[];
  /** The fingerprints of screenshots already read; those are skipped. */
  seen?: () => Iterable<string>;
  /** Fills the account values a bag or profile screenshot showed; returns a status note. */
  useAccount: (totals: Totals) => string;
  /** Called once the screenshots have been read and any Pokémon added. */
  onDone?: () => void;
}

const NONE = 'No Pokémon found in these screenshots. Use the appraisal screen.';
const q = <T extends Element>(root: ParentNode, selector: string) => root.querySelector<T>(selector)!;
const setStatus = (w: ShotsWiring, text: string) => (q(w.root, '[data-shots-status]').textContent = text);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Bag and profile screenshots count as read even when no Pokémon is found.
function readNote(files: number, groups: Group[], accountNote: string): string {
  const shots = `Read ${plural(files, 'screenshot')}`;
  if (!groups.length) return accountNote ? `${shots}.${accountNote}` : NONE;
  return `${shots}: ${groups.length} Pokémon.${accountNote}`;
}

async function settle(w: ShotsWiring, groups: Group[]): Promise<Group[]> {
  const powered = poweredQuestions(groups, w.known?.() ?? [], w.familyOf);
  const questions = [...questionsFor(groups, w.stagesOf), ...powered];
  if (!questions.length) return groups;
  return answer(groups, await askQuestions(q(w.root, '[data-questions]'), questions));
}

// Each line's Pokémon together, lines in the order first read, so each line opens once.
function byLine(groups: Group[], familyOf: FamilyOf): Group[] {
  const order = [...new Set(groups.map((g) => familyOf(g.reading)))];
  const at = (g: Group) => order.indexOf(familyOf(g.reading));
  return [...groups].sort((a, b) => at(a) - at(b));
}

interface Shots {
  readings: Reading[];
  fileOf: Map<Reading, File>;
  printOf: Fresh['printOf'];
}

async function useAll(w: ShotsWiring, groups: Group[], shots: Shots): Promise<void> {
  for (const group of byLine(groups, w.familyOf)) {
    const at = pickShot(shots.readings, group);
    const prints = (group.sources ?? []).map((r) => shots.printOf.get(shots.fileOf.get(r)!)!);
    await w.use(group, at === undefined ? undefined : shots.fileOf.get(shots.readings[at]), prints);
  }
  w.onDone?.();
}

async function readFresh(w: ShotsWiring, fresh: Fresh): Promise<void> {
  const { files } = fresh;
  const progress = (n: number) => setStatus(w, progressNote(n, files.length));
  progress(1);
  const images = await readImages(files, { variant: 'normal', lucky: false }, progress);
  const fileOf = new Map(images.readings.map((r, i) => [r, images.files[i]]));
  const { pokemon, account } = splitAccount(images.readings);
  const groups = groupReadings(pokemon, w.familyOf);
  const accountNote = Object.keys(account).length ? ` ${w.useAccount(account)}` : '';
  setStatus(w, readNote(files.length, groups, accountNote) + failedNote(images.failed) + skippedNote(fresh.skipped));
  await useAll(w, await settle(w, groups), { readings: pokemon, fileOf, printOf: fresh.printOf });
}

// Screenshots read before are skipped without OCR (ADR 0017).
async function readAll(w: ShotsWiring, files: File[]): Promise<void> {
  setStatus(w, progressNote(1, files.length));
  const fresh = await freshFiles(files, new Set(w.seen?.()));
  if (fresh.files.length) return readFresh(w, fresh);
  setStatus(w, skippedNote(fresh.skipped).trim());
  w.onDone?.();
}

/**
 * Hooks up step 1's picker. Returns a function that reads files from elsewhere, such as
 * a share.
 */
export function wireScreenshots(w: ShotsWiring): (files: File[]) => void {
  const read = (files: File[]) => {
    if (files.length) void readAll(w, files).catch(() => setStatus(w, 'Could not read those images. Try again.'));
  };
  const input = q<HTMLInputElement>(w.root, '[name="screenshots"]');
  input.addEventListener('change', () => read([...(input.files ?? [])]));
  return read;
}

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
import { type ChoicesOf, targetQuestions } from './targetQuestions';
import { queueBatches, waitingNote } from './shotQueue';
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
  /** The finals to ask about for each line read (ADR 0017). */
  targetsOf?: ChoicesOf;
  /** The fingerprints of screenshots already read; those are skipped. */
  seen?: () => Iterable<string>;
  /** Fills the account values a bag or profile screenshot showed; returns a status note. */
  useAccount: (totals: Totals) => string;
  /** Checks a screenshot's CP against its species and HP, before sorting (fix C). */
  checkCp?: (reading: Reading) => Reading;
  /** Called once the screenshots have been read and any Pokémon added; the next batch waits for it. */
  onDone?: () => void | Promise<void>;
}

const NONE = 'No Pokémon found in these screenshots. Use the appraisal screen.';
const q = <T extends Element>(root: ParentNode, selector: string) => root.querySelector<T>(selector)!;
const setStatus = (w: ShotsWiring, text: string) => (q(w.root, '[data-shots-status]').textContent = text);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** What a batch held: its Pokémon, and the evolution lines they are in. */
interface Found {
  pokemon: number;
  lines: number;
}

// Bag and profile screenshots count as read even when no Pokémon is found. The lines are
// counted as ADR 0017 says (issue #6).
function readNote(files: number, found: Found, accountNote: string): string {
  const shots = `Read ${plural(files, 'screenshot')}`;
  if (!found.pokemon) return accountNote ? `${shots}.${accountNote}` : NONE;
  return `${shots}: ${found.pokemon} Pokémon in ${plural(found.lines, 'line')}.${accountNote}`;
}

async function settle(w: ShotsWiring, groups: Group[]): Promise<Group[]> {
  const powered = poweredQuestions(groups, w.known?.() ?? [], w.familyOf);
  const targets = w.targetsOf ? targetQuestions(groups, w.familyOf, w.targetsOf) : [];
  const questions = [...questionsFor(groups, w.stagesOf), ...targets, ...powered];
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
  await w.onDone?.();
}

async function readFresh(w: ShotsWiring, fresh: Fresh): Promise<void> {
  const { files } = fresh;
  const progress = (n: number) => setStatus(w, progressNote(n, files.length));
  progress(1);
  const images = await readImages(files, { variant: 'normal', lucky: false }, progress);
  const readings = w.checkCp ? images.readings.map(w.checkCp) : images.readings;
  const fileOf = new Map(readings.map((r, i) => [r, images.files[i]]));
  const { pokemon, account } = splitAccount(readings);
  const groups = groupReadings(pokemon, w.familyOf);
  const accountNote = Object.keys(account).length ? ` ${w.useAccount(account)}` : '';
  const found = { pokemon: groups.length, lines: new Set(groups.map((g) => w.familyOf(g.reading))).size };
  setStatus(w, readNote(files.length, found, accountNote) + failedNote(images.failed) + skippedNote(fresh.skipped));
  await useAll(w, await settle(w, groups), { readings: pokemon, fileOf, printOf: fresh.printOf });
}

// Screenshots read before are skipped without OCR (ADR 0017).
async function readAll(w: ShotsWiring, files: File[]): Promise<void> {
  setStatus(w, progressNote(1, files.length));
  const fresh = await freshFiles(files, new Set(w.seen?.()));
  if (fresh.files.length) return readFresh(w, fresh);
  setStatus(w, skippedNote(fresh.skipped).trim());
  await w.onDone?.();
}

/**
 * Hooks up step 1's picker. Returns a function that reads files from elsewhere, such as
 * a share. Each batch waits for the one before it to be in.
 */
export function wireScreenshots(w: ShotsWiring): (files: File[]) => void {
  const failed = (): void => void setStatus(w, 'Could not read those images. Try again.');
  const read = queueBatches((files) => readAll(w, files).catch(failed), waitingNote(q(w.root, '[data-shots-waiting]')));
  const input = q<HTMLInputElement>(w.root, '[name="screenshots"]');
  input.addEventListener('change', () => read([...(input.files ?? [])]));
  return read;
}

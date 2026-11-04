import { type Group, mergeReadings } from '../core/screen/merge';
import type { Reading } from '../core/screen/types';
import type { Modifiers } from '../core/types';
import { conflictNote } from './conflicts';
import { failedNote, progressNote, readImages } from './readImages';
import { fillDetails } from './scanDetails';

const FIELDS = { cp: 'cp', hp: 'seenHp', dust: 'dust' } as const;
const NAMES = { cp: 'CP', hp: 'HP', dust: 'Stardust' } as const;
type Field = keyof typeof FIELDS;

function setStatus(root: ParentNode, message: string): void {
  root.querySelector('[data-scan-status]')!.textContent = message;
}

function readMods(root: ParentNode): Modifiers {
  const variant = root.querySelector<HTMLSelectElement>('[name="variant"]')!.value as Modifiers['variant'];
  return { variant, lucky: root.querySelector<HTMLInputElement>('[name="lucky"]')!.checked };
}

function setValue(root: ParentNode, name: string, value: number): void {
  root.querySelector<HTMLInputElement>(`[name="${name}"]`)!.value = String(value);
}

function summarise(group: Group, found: Field[], details: string[]): string {
  const { reading, shots } = group;
  const parts = found.map((key) => `${NAMES[key]} ${reading[key]}`);
  const { ivs } = reading;
  if (ivs) parts.push(`IVs ${ivs.atk}/${ivs.def}/${ivs.hp}`);
  parts.push(...details);
  if (!parts.length) return 'Could not find CP or HP. Use a screenshot of the Pokémon or appraisal screen.';
  const from = shots > 1 ? `${shots} screenshots: ` : '';
  return `Read ${from}${parts.join(', ')}. ${ivs ? 'Check them.' : 'Check them, then tap Find IVs.'}`;
}

/** Fills a candidate from one Pokémon's screenshots and says what it read, what clashed and what failed. */
export function fillCandidate(root: ParentNode, group: Group, failed = 0): void {
  const { reading } = group;
  const found = (Object.keys(FIELDS) as Field[]).filter((key) => reading[key] !== undefined);
  for (const key of found) setValue(root, FIELDS[key], reading[key]!);
  const { ivs } = reading;
  if (ivs) (['atk', 'def', 'hp'] as const).forEach((stat) => setValue(root, stat, ivs[stat]));
  else if (found.length) root.querySelector('details')!.open = true;
  const summary = summarise(group, found, fillDetails(root, reading));
  setStatus(root, summary + conflictNote(group.conflicts) + failedNote(failed));
}

type OnRead = (reading: Reading) => void;

async function scan(root: ParentNode, files: File[], onRead: OnRead): Promise<void> {
  setStatus(root, progressNote(1, files.length));
  try {
    const { readings, failed } = await readImages(files, readMods(root), (n) => setStatus(root, progressNote(n, files.length)));
    if (!readings.length) throw new Error('nothing read');
    const group = mergeReadings(readings);
    fillCandidate(root, group, failed);
    onRead(group.reading);
  } catch {
    setStatus(root, 'Could not read that image. Try another screenshot.');
  }
}

/**
 * Hooks up a candidate fieldset's screenshot picker. Every screenshot picked is taken to
 * show this one Pokémon. `onRead` gets the merged reading, so the app can pick the species.
 */
export function wireScreenshot(root: ParentNode, onRead: OnRead = () => undefined): void {
  const input = root.querySelector<HTMLInputElement>('[name="screenshot"]')!;
  input.addEventListener('change', () => {
    const files = [...(input.files ?? [])];
    if (files.length) void scan(root, files, onRead);
  });
}

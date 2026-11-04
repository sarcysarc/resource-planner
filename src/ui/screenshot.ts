import type { Group } from '../core/screen/merge';
import { conflictNote } from './conflicts';
import { failedNote } from './readImages';
import { fillDetails } from './scanDetails';

const FIELDS = { cp: 'cp', hp: 'seenHp', dust: 'dust' } as const;
const NAMES = { cp: 'CP', hp: 'HP', dust: 'Stardust' } as const;
type Field = keyof typeof FIELDS;

function setStatus(root: ParentNode, message: string): void {
  root.querySelector('[data-scan-status]')!.textContent = message;
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
  else if (found.length) root.querySelector<HTMLDetailsElement>('details.finder')!.open = true;
  const summary = summarise(group, found, fillDetails(root, reading));
  setStatus(root, summary + conflictNote(group.conflicts) + failedNote(failed));
}

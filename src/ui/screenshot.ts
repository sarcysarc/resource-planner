import { readScan } from '../core/screen/read';
import type { Reading } from '../core/screen/types';
import type { Modifiers } from '../core/types';

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

function summarise(reading: Reading, found: Field[]): string {
  const parts = found.map((key) => `${NAMES[key]} ${reading[key]}`);
  const { ivs } = reading;
  if (ivs) parts.push(`IVs ${ivs.atk}/${ivs.def}/${ivs.hp}`);
  if (!parts.length) return 'Could not find CP or HP. Use a screenshot of the Pokémon or appraisal screen.';
  return `Read ${parts.join(', ')}. ${ivs ? 'Check them.' : 'Check them, then tap Find IVs.'}`;
}

function fill(root: ParentNode, reading: Reading): void {
  const found = (Object.keys(FIELDS) as Field[]).filter((key) => reading[key] !== undefined);
  for (const key of found) setValue(root, FIELDS[key], reading[key]!);
  const { ivs } = reading;
  if (ivs) (['atk', 'def', 'hp'] as const).forEach((stat) => setValue(root, stat, ivs[stat]));
  else if (found.length) root.querySelector('details')!.open = true;
  setStatus(root, summarise(reading, found));
}

async function scan(root: ParentNode, image: File): Promise<void> {
  setStatus(root, 'Reading screenshot… The first time can take a few seconds.');
  try {
    const { readScreenshot } = await import('../ocr/recognize');
    fill(root, readScan(await readScreenshot(image), readMods(root)));
  } catch {
    setStatus(root, 'Could not read that image. Try another screenshot.');
  }
}

/** Hooks up a candidate fieldset's screenshot picker. The OCR engine loads on first use. */
export function wireScreenshot(root: ParentNode): void {
  const input = root.querySelector<HTMLInputElement>('[name="screenshot"]')!;
  input.addEventListener('change', () => {
    const image = input.files?.[0];
    if (image) void scan(root, image);
  });
}

import { readScreen, type ScreenReading } from '../core/screenText';
import type { Modifiers } from '../core/types';

const FIELDS = { cp: 'cp', hp: 'seenHp', dust: 'dust' } as const;
const NAMES = { cp: 'CP', hp: 'HP', dust: 'Stardust' } as const;

function setStatus(root: ParentNode, message: string): void {
  root.querySelector('[data-scan-status]')!.textContent = message;
}

function readMods(root: ParentNode): Modifiers {
  const variant = root.querySelector<HTMLSelectElement>('[name="variant"]')!.value as Modifiers['variant'];
  return { variant, lucky: root.querySelector<HTMLInputElement>('[name="lucky"]')!.checked };
}

function fill(root: ParentNode, reading: ScreenReading): void {
  const found = (Object.keys(FIELDS) as (keyof ScreenReading)[]).filter((key) => reading[key] !== undefined);
  for (const key of found) {
    root.querySelector<HTMLInputElement>(`[name="${FIELDS[key]}"]`)!.value = String(reading[key]);
  }
  const summary = found.map((key) => `${NAMES[key]} ${reading[key]}`).join(', ');
  setStatus(root, found.length
    ? `Read ${summary}. Check them, then tap Find IVs.`
    : 'Could not find CP or HP. Use a screenshot of the Pokémon screen.');
}

async function scan(root: ParentNode, image: File): Promise<void> {
  setStatus(root, 'Reading screenshot… The first time can take a few seconds.');
  try {
    const { recognizeText } = await import('../ocr/recognize');
    fill(root, readScreen(await recognizeText(image), readMods(root)));
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

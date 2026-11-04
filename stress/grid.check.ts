// Real screenshots through the whole page, from the picker to the grid (ADR 0016). OCR is
// replaced by the saved scans; everything after it is the site's own code.
// @vitest-environment jsdom
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { scenarios, tileWanted, type Outcome } from './scenarios';
import { loadTruth } from './truth';

vi.mock('../src/ocr/recognize', async () => {
  const { loadScan } = await import('./truth');
  return { readScreenshot: async (file: File) => loadScan(file.name)!.scan! };
});
vi.mock('../src/ui/thumb', async (real) => ({ ...(await real<object>()), makeThumb: async (f: File) => `thumb:${f.name}` }));

const { mountApp } = await import('../src/ui/app');
const truth = loadTruth();
const outcomes: Outcome[] = [];
const q = (s: string) => document.querySelector<HTMLElement>(s)!;
Element.prototype.scrollIntoView = () => undefined;

function mount(): void {
  const html = readFileSync('index.html', 'utf8');
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  mountApp(document);
}

function choose(names: string[]): void {
  const input = q('[data-shots] [name="screenshots"]') as HTMLInputElement;
  const files = names.map((name, i) => new File(['x'], name, { lastModified: i }));
  Object.defineProperty(input, 'files', { value: files });
  input.dispatchEvent(new Event('change'));
}

const tiles = () =>
  [...document.querySelectorAll<HTMLElement>('.grid .tile[data-tile]')].map((t) => ({
    title: t.querySelector('[data-title]')?.textContent ?? '',
    notes: [...t.querySelectorAll('[data-notes] li')].map((li) => li.textContent ?? ''),
    thumb: t.querySelector('img')?.getAttribute('src') ?? undefined,
  }));

// Every line's tiles: each line in step 2's list is opened in turn (ADR 0017).
function allTiles(): ReturnType<typeof tiles> {
  const rows = () => [...document.querySelectorAll<HTMLButtonElement>('[data-lines] button')];
  if (rows().length < 2) return tiles();
  return rows().flatMap((_, i) => (rows()[i].click(), tiles()));
}

async function upload(names: string[]): Promise<Omit<Outcome, 'scenario' | 'want'>> {
  mount();
  choose(names);
  const status = () => q('[data-shots-status]').textContent ?? '';
  await vi.waitFor(() => expect(status()).not.toMatch(/^Reading/), { timeout: 20_000 });
  const asked = q('[data-questions]').textContent?.trim() ?? '';
  if (!asked) await vi.waitFor(() => expect(q('[data-step="check"]').hidden).toBe(false));
  return { status: status(), asked, tiles: allTiles() };
}

describe.skipIf(!truth)('the grid after uploading', () => {
  it.each(truth ? scenarios(truth) : [])('$scenario', async ({ scenario, shots, ids }) => {
    const got = await upload(shots);
    const outcome = { scenario, want: ids.map((id) => tileWanted(truth!, id)), ...got };
    outcomes.push(outcome);
    expect(outcome.tiles.map((t) => t.title).sort()).toEqual(outcome.want.map((w) => w.title).sort());
  });

  afterAll(() => writeFileSync('screenshots/stress/grid-outcomes.json', JSON.stringify(outcomes, null, 1)));
});

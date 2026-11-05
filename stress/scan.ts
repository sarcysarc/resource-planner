// Reads every screenshot in screenshots/ with the site's own OCR and saves each scan
// (ADR 0016). Open /stress/scan.html on the dev server; add ?fresh to read them all again.
import { openReader, type Reader } from '../src/ocr/recognize';

interface Listed {
  name: string;
  saved: boolean;
}

const status = document.querySelector('[data-status]')!;
const fresh = new URLSearchParams(location.search).has('fresh');

async function scanOne(reader: Reader, name: string): Promise<void> {
  const blob = await (await fetch(`/screenshots/${name.split('/').map(encodeURIComponent).join('/')}`)).blob();
  const start = performance.now();
  const result = await reader.read(blob).then(
    (scan) => ({ scan }),
    (error: unknown) => ({ error: String(error) }),
  );
  const saved = { name, ms: Math.round(performance.now() - start), bytes: blob.size, ...result };
  await fetch(`/__stress/scan?name=${encodeURIComponent(name)}`, { method: 'POST', body: JSON.stringify(saved) });
}

async function run(): Promise<void> {
  const listed: Listed[] = await (await fetch('/__stress/list')).json();
  const todo = listed.filter((l) => fresh || !l.saved);
  // One reader for the run, as for an upload (fix E).
  const reader = await openReader();
  for (const [i, { name }] of todo.entries()) {
    status.textContent = `Reading ${i + 1} of ${todo.length}: ${name}`;
    await scanOne(reader, name);
  }
  await reader.close();
  status.textContent = `Done: ${todo.length} read, ${listed.length - todo.length} already saved.`;
}

void run();

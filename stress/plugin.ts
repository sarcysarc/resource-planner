// Dev-server-only endpoints for the stress run (ADR 0016). They list the real screenshots
// in the gitignored screenshots/ folder and save what OCR read from each, so the slow
// reading happens once and every later check runs from the saved scans.
import { mkdirSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const ROOT = 'screenshots';
const SCANS = join(ROOT, 'stress', 'scans');
const IMAGE = /\.(png|jpe?g)$/i;

/** The saved scan's file for a screenshot path relative to screenshots/. */
export const scanFile = (name: string) => join(SCANS, `${encodeURIComponent(name)}.json`);

function images(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === 'stress' || entry === 'node_modules' ? [] : images(path);
    return IMAGE.test(entry) ? [relative(ROOT, path).replaceAll('\\', '/')] : [];
  });
}

const list = () => images(ROOT).map((name) => ({ name, saved: existsSync(scanFile(name)) }));

function save(req: IncomingMessage, res: ServerResponse): void {
  const name = new URL(req.url ?? '', 'http://localhost').searchParams.get('name') ?? '';
  let body = '';
  req.on('data', (chunk: Buffer) => (body += chunk.toString()));
  req.on('end', () => {
    mkdirSync(SCANS, { recursive: true });
    writeFileSync(scanFile(name), body);
    res.end('saved');
  });
}

/** Adds GET /__stress/list and POST /__stress/scan?name=… to the dev server only. */
export function stressPlugin(): Plugin {
  return {
    name: 'stress',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__stress/list', (_req, res) => res.end(JSON.stringify(list())));
      server.middlewares.use('/__stress/scan', save);
    },
  };
}

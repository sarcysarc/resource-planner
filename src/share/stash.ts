/**
 * Screenshots shared to the installed app pass through Cache Storage on the phone:
 * the service worker stashes them, the page takes them out (ADR 0010).
 */

/** The parts of a Cache that are used, so tests can stand in for it. */
export interface CacheLike {
  put(key: string, response: Response): Promise<void>;
  keys(): Promise<readonly Request[]>;
  match(request: Request): Promise<Response | undefined>;
  delete(request: Request): Promise<boolean>;
}

export const CACHE = 'shared-screenshots';
/** The form field the manifest's share_target names. */
export const FIELD = 'screenshots';
const NAME = 'x-file-name';

export function isShare(request: { method: string; url: string }, scope: string): boolean {
  return request.method === 'POST' && request.url === `${scope}share`;
}

async function clear(cache: CacheLike): Promise<readonly Request[]> {
  const keys = await cache.keys();
  await Promise.all(keys.map((key) => cache.delete(key)));
  return keys;
}

const isImage = (value: FormDataEntryValue): value is File => typeof value !== 'string' && value.type.startsWith('image/');

/** Keeps the shared images, replacing any left from an earlier share. Returns how many. */
export async function stashShared(form: FormData, cache: CacheLike, scope: string): Promise<number> {
  await clear(cache);
  const files = form.getAll(FIELD).filter(isImage);
  const headers = (f: File) => ({ 'content-type': f.type, [NAME]: encodeURIComponent(f.name) });
  await Promise.all(files.map((f, i) => cache.put(`${scope}shared/${i}`, new Response(f, { headers: headers(f) }))));
  return files.length;
}

const position = (key: Request) => Number(key.url.slice(key.url.lastIndexOf('/') + 1));

async function toFile(cache: CacheLike, key: Request): Promise<File | undefined> {
  const response = await cache.match(key);
  if (!response) return undefined;
  const name = decodeURIComponent(response.headers.get(NAME) ?? `shared-${position(key)}.png`);
  return new File([await response.blob()], name, { type: response.headers.get('content-type') ?? '' });
}

/** Takes the shared images out, in the order they were shared, and deletes them. */
export async function takeShared(cache: CacheLike): Promise<File[]> {
  const keys = [...(await cache.keys())].sort((a, b) => position(a) - position(b));
  const files = await Promise.all(keys.map((key) => toFile(cache, key)));
  await clear(cache);
  return files.filter((f): f is File => f !== undefined);
}

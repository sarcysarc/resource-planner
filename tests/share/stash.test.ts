import { describe, expect, it } from 'vitest';
import { type CacheLike, isShare, stashShared, takeShared } from '../../src/share/stash';

const SCOPE = 'https://example.test/app/';

// Cache Storage in memory, keyed by URL in the order things were put.
function fakeCache(): CacheLike & { size: () => number } {
  const store = new Map<string, Response>();
  return {
    put: async (key, response) => void store.set(String(key), response),
    keys: async () => [...store.keys()].map((url) => new Request(url)),
    match: async (request) => store.get(new Request(request).url)?.clone(),
    delete: async (request) => store.delete(new Request(request).url),
    size: () => store.size,
  };
}

function form(...files: File[]): FormData {
  const data = new FormData();
  files.forEach((f) => data.append('screenshots', f));
  return data;
}

const png = (name: string, body = name) => new File([body], name, { type: 'image/png' });

describe('isShare', () => {
  it('matches only a POST to the share URL in scope', () => {
    expect(isShare({ method: 'POST', url: `${SCOPE}share` }, SCOPE)).toBe(true);
    expect(isShare({ method: 'GET', url: `${SCOPE}share` }, SCOPE)).toBe(false);
    expect(isShare({ method: 'POST', url: `${SCOPE}other` }, SCOPE)).toBe(false);
  });
});

describe('stashShared and takeShared', () => {
  it('hands back the shared images in order, with names and types', async () => {
    const cache = fakeCache();
    expect(await stashShared(form(png('a.png'), png('b.png')), cache, SCOPE)).toBe(2);
    const files = await takeShared(cache);
    expect(files.map((f) => [f.name, f.type])).toEqual([['a.png', 'image/png'], ['b.png', 'image/png']]);
    expect(await files[1]!.text()).toBe('b.png');
  });

  it('removes the images once taken, so they are read once', async () => {
    const cache = fakeCache();
    await stashShared(form(png('a.png')), cache, SCOPE);
    await takeShared(cache);
    expect(cache.size()).toBe(0);
    expect(await takeShared(cache)).toEqual([]);
  });

  it('replaces images from an earlier share that was never opened', async () => {
    const cache = fakeCache();
    await stashShared(form(png('old.png')), cache, SCOPE);
    await stashShared(form(png('new.png')), cache, SCOPE);
    expect((await takeShared(cache)).map((f) => f.name)).toEqual(['new.png']);
  });

  it('keeps only images', async () => {
    const cache = fakeCache();
    const data = form(png('a.png'), new File(['x'], 'notes.txt', { type: 'text/plain' }));
    data.append('screenshots', 'not a file');
    expect(await stashShared(data, cache, SCOPE)).toBe(1);
  });

  it('keeps more than ten in number order', async () => {
    const cache = fakeCache();
    const names = Array.from({ length: 12 }, (_, i) => `${i}.png`);
    await stashShared(form(...names.map((n) => png(n))), cache, SCOPE);
    expect((await takeShared(cache)).map((f) => f.name)).toEqual(names);
  });
});

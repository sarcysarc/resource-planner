// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { receiveShared } from '../../src/share/receive';
import { CACHE } from '../../src/share/stash';

const shot = new File(['x'], 'a.png', { type: 'image/png' });

function stubCaches(files: File[]): ReturnType<typeof vi.fn> {
  const open = vi.fn(async () => ({
    keys: async () => files.map((_, i) => new Request(`https://example.test/shared/${i}`)),
    match: async (key: Request) => new Response(files[Number(key.url.slice(-1))], { headers: { 'content-type': 'image/png', 'x-file-name': 'a.png' } }),
    delete: async () => true,
  }));
  vi.stubGlobal('caches', { open });
  return open;
}

describe('receiveShared', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('does nothing on a normal visit', async () => {
    const open = stubCaches([shot]);
    expect(await receiveShared(window)).toEqual([]);
    expect(open).not.toHaveBeenCalled();
  });

  it('takes the shared screenshots and clears the query', async () => {
    const open = stubCaches([shot]);
    window.history.replaceState(null, '', '/app/?shared=1');
    const files = await receiveShared(window);
    expect(open).toHaveBeenCalledWith(CACHE);
    expect(files.map((f) => f.name)).toEqual(['a.png']);
    expect(window.location.href).toBe('http://localhost:3000/app/');
  });

  it('gives nothing when the browser has no Cache Storage', async () => {
    window.history.replaceState(null, '', '/?shared=1');
    expect(await receiveShared(window)).toEqual([]);
  });
});

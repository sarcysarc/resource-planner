import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIELD, isShare } from '../../src/share/stash';

const read = (path: string) => readFileSync(path, 'utf8');
const manifest = () => JSON.parse(read('public/manifest.webmanifest'));

describe('web app manifest', () => {
  it('is linked from the page with a theme colour', () => {
    expect(read('index.html')).toContain('<link rel="manifest" href="./manifest.webmanifest" />');
    expect(read('index.html')).toContain('<meta name="theme-color"');
  });

  it('keeps the neutral name and works under any path', () => {
    const m = manifest();
    expect([m.name, m.short_name, m.display]).toEqual(['Candy Planner', 'Candy Planner', 'standalone']);
    expect([m.start_url, m.scope]).toEqual(['./', './']);
  });

  it('accepts images posted to the URL the service worker answers', () => {
    const { action, method, enctype, params } = manifest().share_target;
    expect([method, enctype]).toEqual(['POST', 'multipart/form-data']);
    expect(params.files).toEqual([{ name: FIELD, accept: ['image/*'] }]);
    const scope = 'https://example.test/app/';
    expect(isShare({ method, url: new URL(action, scope).href }, scope)).toBe(true);
  });

  it('has install icons that exist', () => {
    const icons: { src: string; sizes: string }[] = manifest().icons;
    expect(icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    icons.forEach((i) => expect(existsSync(`public/${i.src}`)).toBe(true));
  });
});

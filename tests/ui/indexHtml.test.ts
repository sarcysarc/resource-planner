import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('index.html', () => {
  it('asks search engines not to index the page', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('<meta name="robots" content="noindex, nofollow" />');
  });

  it('keeps the search list closed until asked for', () => {
    expect(readFileSync('index.html', 'utf8')).toMatch(/<details class="searches" data-searches hidden>/);
  });

  it('says what XL Candy and Rare Candy are for', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('XL Candy is needed above level 40');
    expect(html).toContain('Rare Candy turns into any Pokémon’s Candy');
  });
});

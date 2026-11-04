import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('index.html', () => {
  it('asks search engines not to index the page', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('<meta name="robots" content="noindex, nofollow" />');
  });
});

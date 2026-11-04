// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fingerprint, freshFiles, skippedNote } from '../../src/ui/fingerprint';

const file = (text: string, name = 'a.png') => new File([text], name);

describe('fingerprint', () => {
  it('is the start of the SHA-256 of the bytes, whatever the file is called', async () => {
    expect(await fingerprint(file('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223');
    expect(await fingerprint(file('abc', 'shared/0'))).toBe('ba7816bf8f01cfea414140de5dae2223');
    expect(await fingerprint(file('abd'))).not.toBe('ba7816bf8f01cfea414140de5dae2223');
  });
});

describe('freshFiles', () => {
  it('leaves out files already read and one chosen twice, keeping each print', async () => {
    const [a, b, c] = [file('a', '1.png'), file('b', '2.png'), file('a', '3.png')];
    const seen = new Set([await fingerprint(b)]);
    const fresh = await freshFiles([a, b, c], seen);
    expect([fresh.files, fresh.skipped]).toEqual([[a], 2]);
    expect(fresh.printOf.get(a)).toBe(await fingerprint(a));
  });
});

describe('skippedNote', () => {
  it('says how many were skipped, or nothing', () => {
    expect([skippedNote(0), skippedNote(1), skippedNote(3)]).toEqual(['', ' Skipped 1 already added.', ' Skipped 3 already added.']);
  });
});

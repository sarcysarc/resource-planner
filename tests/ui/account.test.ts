// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readAccount } from '../../src/ui/account';

function fieldset(values: Record<string, string>): HTMLFieldSetElement {
  const root = document.createElement('fieldset');
  for (const [name, value] of Object.entries(values)) {
    const el = document.createElement('input');
    el.name = name;
    el.value = value;
    root.append(el);
  }
  return root;
}

describe('readAccount', () => {
  it('reads Rare Candy, Rare Candy XL and the trainer level', () => {
    const r = readAccount(fieldset({ rareCandy: '12', rareXl: '3', trainerLevel: '30' }));
    expect(r).toEqual({ ok: true, value: { rare: { candy: 12, xl: 3 }, trainerLevel: 30 } });
  });

  it('treats blanks as no Rare Candy and no level limit', () => {
    const r = readAccount(fieldset({ rareCandy: '', rareXl: '', trainerLevel: '' }));
    expect(r).toEqual({ ok: true, value: { rare: { candy: 0, xl: 0 }, trainerLevel: undefined } });
  });

  it('rejects a level no trainer can have', () => {
    const r = readAccount(fieldset({ rareCandy: '', rareXl: '', trainerLevel: '51' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Trainer level');
  });
});

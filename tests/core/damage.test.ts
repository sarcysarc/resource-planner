import { describe, expect, it } from 'vitest';
import { damage, type Combatant } from '../../src/core/damage';

const stats = (atk: number, def: number) => ({ atk, def, hp: 100 });

const attacker: Combatant = { stats: stats(150, 100), types: ['water'], variant: 'normal' };
const defender: Combatant = { stats: stats(100, 100), types: ['normal'], variant: 'normal' };
const tackle = { power: 100, type: 'normal' };

describe('damage', () => {
  it('is half power times attack over defence, rounded down, plus one (PvE)', () => {
    expect(damage({ move: tackle, attacker, defender, mode: 'pve' })).toBe(76);
  });

  it('adds STAB and type effectiveness', () => {
    const fire: Combatant = { ...defender, types: ['fire'] };
    expect(damage({ move: { power: 100, type: 'water' }, attacker, defender: fire, mode: 'pve' })).toBe(145);
  });

  it('adds the 1.3 PvP bonus', () => {
    const fire: Combatant = { ...defender, types: ['fire'] };
    expect(damage({ move: { power: 100, type: 'water' }, attacker, defender: fire, mode: 'pvp' })).toBe(188);
  });

  it('raises a Shadow attacker’s Attack by 1.2', () => {
    const shadow: Combatant = { ...attacker, variant: 'shadow' };
    expect(damage({ move: tackle, attacker: shadow, defender, mode: 'pve' })).toBe(91);
  });

  it('lowers a Shadow defender’s Defence to 0.8333333', () => {
    const shadow: Combatant = { ...defender, variant: 'shadow' };
    expect(damage({ move: tackle, attacker, defender: shadow, mode: 'pve' })).toBe(91);
  });

  it('treats Purified like normal', () => {
    const purified: Combatant = { ...attacker, variant: 'purified' };
    expect(damage({ move: tackle, attacker: purified, defender, mode: 'pve' })).toBe(76);
  });

  it('always deals at least 1', () => {
    expect(damage({ move: { power: 0, type: 'normal' }, attacker, defender, mode: 'pvp' })).toBe(1);
  });
});

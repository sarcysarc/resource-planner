import { describe, expect, it } from 'vitest';
import { readSecondMove } from '../../../src/core/screen/moves';

const lines = (text: string) => text.split('\n');

describe('readSecondMove', () => {
  it('is locked when the NEW ATTACK button shows', () => {
    expect(readSecondMove(lines('GYMS & RAIDS\n(eo) Confusion 19\n© Return 25\nNEW ATTACK f40,000 40'))).toBe(false);
  });

  it('is locked when only the matching Stardust and Candy cost was read', () => {
    expect(readSecondMove(lines('GYMS & RAIDS\n0 Confusion 19+4\n© Psystrike 95\n1 100,000 £ 100'))).toBe(false);
    expect(readSecondMove(lines('GYMS & RAIDS\nO Lick 5+1\n§90,000 £90'))).toBe(false);
  });

  it('is unlocked when a fast move and two charged moves show', () => {
    const screen = 'GYMS & RAIDS TRAINER BATTLES\n© Dragon Tail 14+3\nWEATHER BONUS\n© Stone Edge 105\n© Thunder Fy 100\n& CAUGHT IN THE WILD';
    expect(readSecondMove(lines(screen))).toBe(true);
  });

  it('counts lowercase move names OCR produces', () => {
    expect(readSecondMove(lines('GYMS & RAIDS\nO snarl 11\n© Fire Blast 140\n©) Wild Charge 90\nHATCHED FROM AN EGG'))).toBe(true);
  });

  it('needs the origin label straight after the moves, so a stray line is not taken for a third move', () => {
    expect(readSecondMove(lines('GYMS & RAIDS\nO Astonish\n(a) Earth Power = ©\nck mon'))).toBeUndefined();
  });

  it('stops at a garbled button, so an unread NEW ATTACK does not count as a move', () => {
    expect(readSecondMove(lines('GYMS & RAIDS\n(eo) Confusion\n© Return =)\nTE\nCAUGHT AFTER DEFEATING GRUNT'))).toBeUndefined();
  });

  it('says nothing when the moves are off screen', () => {
    expect(readSecondMove(lines('POWER UP 9,000 12'))).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { fall, keyLayout, keyName, keyPrompt, sameKey, typingSpeed } from './helpers';
describe('practice helpers', () => {
  it('lays out every letter and the special keys with real proportions', () => {
    const rows = keyLayout(), keys = rows.flat();
    expect(rows[1]!.map((cap) => cap.key).join('')).toBe('QWERTYUIOP');
    expect(keys.filter((cap) => /^[A-Z]$/.test(cap.key))).toHaveLength(26);
    expect(keys.filter((cap) => cap.key === 'Shift')).toHaveLength(2);
    for (const key of ['Enter', 'Backspace', ' ']) expect(keys.find((cap) => cap.key === key)!.width).toBeGreaterThan(1);
    expect(keyName(' ')).toBe('Space'); expect(keyName('c')).toBe('C');
    expect(keyPrompt('c')).toBe('Find the letter C.'); expect(keyPrompt(' ')).toBe('Find the Space bar.');
    expect(keyPrompt('1')).toBe('Find the number 1.');
    expect(sameKey('C', 'c')).toBe(true); expect(sameKey(' ', 'Space')).toBe(false);
  });
  it('slows on a miss, grows gently on catches, and stays bounded', () => {
    expect(typingSpeed(4, false)).toBe(3.2); expect(typingSpeed(4, true)).toBe(4.15);
    expect(typingSpeed(2, false)).toBe(2); expect(typingSpeed(6, true)).toBe(6);
    expect(fall(99, 4, 1)).toEqual({ position: 0, speed: 3.2 });
    expect(fall(10, 4, .5)).toEqual({ position: 12, speed: 4 });
  });
});

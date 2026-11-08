import { describe, expect, it } from 'vitest';
import {
  ALPHABET, caesarDecode, caesarEncode, decodeLetter, normalizeShift, wheel,
} from './cipher';

const mixedText = 'Hello, Agent Z! abc XYZ 0123. Café 😀\n';
const shifts = Array.from({ length: 121 }, (_, index) => index - 60);
const invalidShifts = [1.5, -0.5, NaN, Infinity, -Infinity];

describe('normalizeShift', () => {
  it.each([
    [0, 0], [-0, 0], [3, 3], [25, 25], [26, 0], [29, 3],
    [-1, 25], [-26, 0], [-29, 23], [60, 8], [-60, 18],
    [Number.MAX_SAFE_INTEGER, 5], [Number.MIN_SAFE_INTEGER, 21],
  ])('wraps %s to %s', (shift, expected) => {
    expect(normalizeShift(shift)).toBe(expected);
  });

  it.each(invalidShifts)('rejects %s with RangeError', (shift) => {
    expect(() => normalizeShift(shift)).toThrow(RangeError);
  });
});

describe('Caesar cipher', () => {
  it.each([
    ['HELLO', 3, 'KHOOR'],
    ['abc', -1, 'zab'],
    ['Az By!', 3, 'Dc Eb!'],
    [mixedText, 0, mixedText],
    [mixedText, 26, mixedText],
    ['HELLO', 29, 'KHOOR'],
    ['', 3, ''],
  ])('encodes %j at shift %s as %j', (plain, shift, cipher) => {
    expect(caesarEncode(plain, shift)).toBe(cipher);
    expect(caesarDecode(cipher, shift)).toBe(plain);
  });

  it.each(shifts)('round trips mixed text at shift %s', (shift) => {
    expect(caesarDecode(caesarEncode(mixedText, shift), shift)).toBe(mixedText);
    expect(caesarEncode(caesarDecode(mixedText, shift), shift)).toBe(mixedText);
  });

  it('leaves every non-ASCII letter and non-letter untouched', () => {
    const unchanged = 'éÉñßΩ中😀 0123!?\n\t';
    expect(caesarEncode(unchanged, 3)).toBe(unchanged);
    expect(caesarDecode(unchanged, 3)).toBe(unchanged);
  });

  it.each(invalidShifts)('validates shift %s even for empty text', (shift) => {
    expect(() => caesarEncode('', shift)).toThrow(RangeError);
    expect(() => caesarDecode('', shift)).toThrow(RangeError);
  });
});

describe('wheel', () => {
  it.each(shifts)('pairs each plain letter with its encoding at shift %s', (shift) => {
    const pairs = wheel(shift);
    expect(pairs).toHaveLength(26);
    expect(pairs.map(({ plain }) => plain).join('')).toBe(ALPHABET);
    expect(pairs.map(({ cipher }) => cipher).sort().join('')).toBe(ALPHABET);
    for (const { plain, cipher } of pairs) {
      expect(cipher).toBe(caesarEncode(plain, shift));
    }
  });

  it('starts a shift-three wheel with A paired with D', () => {
    expect(wheel(3)[0]).toEqual({ plain: 'A', cipher: 'D' });
  });

  it.each(invalidShifts)('rejects invalid shift %s', (shift) => {
    expect(() => wheel(shift)).toThrow(RangeError);
  });
});

describe('decodeLetter', () => {
  it.each([
    ['D', 3, 'A'], ['d', 3, 'a'], ['A', 3, 'X'], ['z', -1, 'a'],
    ['D', 29, 'A'], ['a', 26, 'a'], ['!', 3, '!'], [' ', 3, ' '],
    ['7', 3, '7'], ['é', 3, 'é'], ['😀', 3, '😀'],
  ])('decodes %j at shift %s as %j', (letter, shift, expected) => {
    expect(decodeLetter(letter, shift)).toBe(expected);
  });

  it.each(invalidShifts)('rejects invalid shift %s', (shift) => {
    expect(() => decodeLetter('A', shift)).toThrow(RangeError);
    expect(() => decodeLetter('!', shift)).toThrow(RangeError);
  });
});

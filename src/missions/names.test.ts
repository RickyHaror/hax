import { describe, expect, it } from 'vitest';
import { firstWords, secondWords } from './names';

describe('hacker name words', () => {
  for (const [name, list] of Object.entries({ firstWords, secondWords })) {
    it(`${name} has exactly 64 unique words, ignoring case`, () => {
      expect(list).toHaveLength(64);
      expect(new Set(list.map((word) => word.toLowerCase())).size).toBe(64);
    });

    it(`${name} uses capitalized words of 3 to 8 letters`, () => {
      for (const word of list) expect(word).toMatch(/^[A-Z][a-z]{2,7}$/);
    });
  }

  it('has no words shared between the lists, ignoring case', () => {
    const first = new Set(firstWords.map((word) => word.toLowerCase()));
    const overlap = secondWords.filter((word) => first.has(word.toLowerCase()));
    expect(overlap).toEqual([]);
  });
});

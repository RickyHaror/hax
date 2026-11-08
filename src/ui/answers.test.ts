import { describe, expect, it } from 'vitest';
import { answersMatch } from './answers';

describe('answer comparison', () => {
  it('ignores case and normalizes whitespace on both sides', () => {
    expect(answersMatch('feed  the SEALS ', 'FEED THE SEALS')).toBe(true);
    expect(answersMatch(' Feed the seals ', '  FEED\tTHE   SEALS\n')).toBe(true);
  });

  it('honors alternate answers with the same normalization', () => {
    expect(answersMatch(' green MOON ', 'Blue Star', ['  GREEN\t Moon '])).toBe(true);
    expect(answersMatch('Red Sun', 'Blue Star', ['Green Moon'])).toBe(false);
  });

  it('never matches empty or whitespace-only input', () => {
    for (const input of ['', ' \t\n ']) {
      expect(answersMatch(input, '')).toBe(false);
      expect(answersMatch(input, 'Blue Star', ['', '  '])).toBe(false);
    }
  });
});

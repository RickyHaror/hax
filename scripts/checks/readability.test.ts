import { describe, expect, it } from 'vitest';
import { fleschKincaidGrade, lineProblems, sentences, syllables } from './readability';

describe('readability', () => {
  it('counts syllables roughly', () => {
    expect(syllables('cat')).toBe(1);
    expect(syllables('pizza')).toBe(2);
    expect(syllables('banana')).toBe(3);
  });
  it('splits sentences', () => {
    expect(sentences('Hi there. Ready? Go!')).toEqual(['Hi there.', 'Ready?', 'Go!']);
  });
  it('flags long sentences and hard words', () => {
    expect(lineProblems('This sentence has far too many words in it for a young new reader today.')).not.toEqual([]);
    expect(lineProblems('We need authentication.')).not.toEqual([]);
    expect(lineProblems('Find the secret password.')).toEqual([]);
  });
  it('grades simple text low', () => {
    expect(fleschKincaidGrade(['The cat sat on the mat. It was a fun day.'])).toBeLessThan(2);
  });
});

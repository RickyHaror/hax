import { describe, expect, it } from 'vitest';
import { splitClueText } from './clueText';

const makeClue = (id: string, match: string) => ({ id, match, explain: { text: 'Look closely.' } });
describe('splitClueText', () => {
  it('splits only the first repeated match, preserving every character', () => {
    const result = splitClueText(['Try prize then prize.'], [makeClue('prize', 'prize')]);
    expect(result.fields[0]).toEqual([{ text: 'Try ' }, { text: 'prize', clueId: 'prize' }, { text: ' then prize.' }]);
    expect(result.fallback).toEqual([]);
  });
  it('prefers an exact case match across all fields', () => {
    const result = splitClueText(['PRIZE Club', 'Get a Prize', 'Prize again'], [makeClue('p', 'Prize')]);
    expect(result.fields[0]).toEqual([{ text: 'PRIZE Club' }]);
    expect(result.fields[1]).toEqual([{ text: 'Get a ' }, { text: 'Prize', clueId: 'p' }]);
    expect(result.fields[2]).toEqual([{ text: 'Prize again' }]);
  });
  it('falls back to case insensitive matching and keeps displayed case', () => {
    expect(splitClueText(['Get a PRIZE!'], [makeClue('p', 'prize')]).fields[0])
      .toEqual([{ text: 'Get a ' }, { text: 'PRIZE', clueId: 'p' }, { text: '!' }]);
  });
  it('keeps overlapping clues reachable without duplicating email text', () => {
    const result = splitClueText(['Send your password now.'], [
      makeClue('wide', 'your password'), makeClue('inner', 'PASSWORD'), makeClue('tail', 'password now'),
    ]);
    expect(result.fields[0]?.map((part) => part.text).join('')).toBe('Send your password now.');
    expect(result.fallback).toEqual([{ text: 'password', clueId: 'inner' }, { text: 'password now', clueId: 'tail' }]);
  });
  it('handles identical matches, missing matches, and empty fields', () => {
    const result = splitClueText(['', 'prize prize'], [
      makeClue('first', 'prize'), makeClue('second', 'prize'), makeClue('missing', 'secret'), makeClue('empty', ''),
    ]);
    expect(result.fields[0]).toEqual([]);
    expect(result.fields[1]).toEqual([{ text: 'prize', clueId: 'first' }, { text: ' prize' }]);
    expect(result.fallback).toEqual([
      { text: 'prize', clueId: 'second' }, { text: 'secret', clueId: 'missing' }, { text: '', clueId: 'empty' },
    ]);
  });
  it('handles adjacent clues and literal punctuation', () => {
    expect(splitClueText(['[x]?!'], [makeClue('x', '[x]'), makeClue('q', '?!')]).fields[0])
      .toEqual([{ text: '[x]', clueId: 'x' }, { text: '?!', clueId: 'q' }]);
  });
});

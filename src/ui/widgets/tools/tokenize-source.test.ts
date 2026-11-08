import { describe, expect, it } from 'vitest';
import { tokenizeSource } from './tokenize-source';

describe('pretend source colours', () => {
  it('distinguishes comments, tags, attributes and quoted strings', () => {
    const source = '<!-- secret: blue -->\n<h1 class="toy" title=\'Hi > there\'>Toys</h1>';
    const tokens = tokenizeSource(source);
    expect(tokens.map((token) => token.text).join('')).toBe(source);
    expect(tokens.filter((token) => token.kind === 'comment').map((token) => token.text)).toEqual(['<!-- secret: blue -->']);
    expect(tokens.filter((token) => token.kind === 'tag').map((token) => token.text)).toEqual(['<h1', '>', '</h1>']);
    expect(tokens.filter((token) => token.kind === 'attribute').map((token) => token.text)).toEqual(['class', 'title']);
    expect(tokens.filter((token) => token.kind === 'string').map((token) => token.text)).toEqual(['"toy"', "'Hi > there'"]);
  });
  it('keeps multiline comments and unfinished source as plain source text', () => {
    for (const source of ['<!-- a\n<b x="y">\n-->', '<p title="unfinished', '2 < 3 &amp; 4', '<!-- open', '<input disabled />', '']) {
      expect(tokenizeSource(source).map((token) => token.text).join('')).toBe(source);
    }
    expect(tokenizeSource('<!-- a\n<b>\n-->')).toEqual([{ kind: 'comment', text: '<!-- a\n<b>\n-->' }]);
  });
});

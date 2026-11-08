import { describe, expect, it } from 'vitest';
import { accepts, createMachine, output, suggest } from './hack-state';
import { target } from './hack-test-data';

describe('hack output and state helpers', () => {
  it('wraps long data lines, preserving blank lines', () => {
    const result = output(['one two three four five six seven eight nine ten eleven twelve thirteen', '']);
    expect(result.lines.map((line) => line.text)).toEqual([
      'one two three four five six seven eight nine ten eleven twelve', 'thirteen', '',
    ]);
  });

  it('accepts exact credentials and case insensitive aliases', () => {
    expect(accepts('Code', 'Code')).toBe(true);
    expect(accepts('code', 'Code')).toBe(false);
    expect(accepts('OTHER', 'Code', ['other'])).toBe(true);
  });

  it('suggests help without a command list and handles very long input', () => {
    expect(suggest('unknown', []).lines[0]?.text).toBe('Did you mean help?');
    expect(suggest('x'.repeat(10000), ['ls']).lines[0]?.kind).toBe('hint');
  });

  it('starts login machines signed out with their own virtual home', () => {
    const machine = createMachine(target({ login: { user: 'admin', password: 'code' } }));
    expect(machine.loggedIn).toBe(false);
    expect(machine.root).toBe(false);
    expect(machine.fs.resolve('~')).toBe('/home/admin');
  });
});

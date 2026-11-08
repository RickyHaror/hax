import { describe, expect, it } from 'vitest';
import { complete } from './complete';
import { VirtualFs } from './fs';
import { tokenize } from './shell';
import { HACK_COMMANDS } from './hack';
import type { FsDir } from './types';

const tree: FsDir = { type: 'dir', children: {
  notes: { type: 'dir', children: { 'menu.txt': { type: 'file', content: 'Cheese.' } } },
  'note.txt': { type: 'file', content: 'Hello.' },
  'notice.txt': { type: 'file', content: 'Hi.' },
  'readme.txt': { type: 'file', content: 'Welcome.' },
  '.secret': { type: 'file', content: 'A hat.' },
  '.stash': { type: 'dir', children: {} },
  'my "best" note': { type: 'file', content: 'Nice.' },
} };
function context() { return { commands: ['cat', 'cd', 'clear', 'ls'], fs: new VirtualFs(tree) }; }

describe('complete', () => {
  it('finishes one command and adds a space', () => {
    expect(complete('ca', context())).toEqual({ value: 'cat ', suggestion: 't ', options: ['cat'] });
    expect(complete('cat', context()).value).toBe('cat ');
  });

  it('extends several matches to their longest shared prefix', () => {
    expect(complete('c', context())).toEqual({ value: 'c', suggestion: null, options: ['cat', 'cd', 'clear'] });
    expect(complete('cat n', context())).toEqual({
      value: 'cat not', suggestion: null, options: ['notes/', 'note.txt', 'notice.txt'],
    });
  });

  it('leaves missing commands, files and invalid paths alone', () => {
    for (const value of ['xyz', 'cat absent', 'cat missing/no', 'cat readme.txt/no']) {
      expect(complete(value, context())).toEqual({ value, suggestion: null, options: [] });
    }
  });

  it('adds a space after files, but keeps folders open for paths', () => {
    expect(complete('cat r', context())).toEqual({ value: 'cat readme.txt ', suggestion: 'eadme.txt ', options: ['readme.txt'] });
    expect(complete('cd notes', context())).toEqual({ value: 'cd notes/', suggestion: '/', options: ['notes/'] });
    expect(complete('cat notes/m', context()).value).toBe('cat notes/menu.txt ');
    expect(complete('cat /notes/m', context()).value).toBe('cat /notes/menu.txt ');
  });

  it('uses the current folder without changing it or the tree', () => {
    const ctx = context();
    ctx.fs.cd('notes');
    const snapshot = ctx.fs.snapshot();
    expect(complete('cat m', ctx).value).toBe('cat menu.txt ');
    expect(complete('cat ../r', ctx).value).toBe('cat ../readme.txt ');
    expect(ctx.fs.cwd()).toBe('/notes');
    expect(ctx.fs.snapshot()).toEqual(snapshot);
  });

  it('only suggests hidden entries after a dot prefix', () => {
    expect(complete('cat ', context()).options).not.toContain('.secret');
    expect(complete('cat .s', context()).options).toEqual(['.stash/', '.secret']);
    expect(complete('cat .se', context()).value).toBe('cat .secret ');
    expect(complete('cat .st', context()).value).toBe('cat .stash/');
  });

  it.each(['connect', 'scan'])('completes hosts after %s', (command) => {
    const ctx = { ...context(), hosts: ['shop-pc', 'school-pc', 'hq'] };
    expect(complete(`${command} sh`, ctx)).toEqual({ value: `${command} shop-pc `, suggestion: 'op-pc ', options: ['shop-pc'] });
    expect(complete(`${command} s`, ctx)).toEqual({ value: `${command} s`, suggestion: null, options: ['shop-pc', 'school-pc'] });
    expect(complete(`${command} `, context()).options).toEqual([]);
  });

  it('keeps leading spaces and earlier arguments intact', () => {
    expect(complete('  ca', context()).value).toBe('  cat ');
    expect(complete('ls -a r', context()).value).toBe('ls -a readme.txt ');
    expect(complete('', context()).suggestion).toBeNull();
  });

  it.each(['cat my', 'cat "my', "cat 'my"] )('keeps spaces and quotes usable after %s', (input) => {
    const result = complete(input, context());
    expect(result.suggestion).toBe(result.value.slice(input.length));
    expect(tokenize(result.value)).toEqual({ ok: true, tokens: ['cat', 'my "best" note'] });
  });

  it('keeps an open quote through folder completion', () => {
    const ctx = context();
    const folder = complete('cat "note', ctx);
    expect(folder.value).toBe('cat "note');
    expect(complete('cat "notes', ctx).value).toBe('cat "notes/');
    expect(complete('cat "notes/m', ctx).value).toBe('cat "notes/menu.txt" ');
  });

  it.each(HACK_COMMANDS)('completes the new command list including %s', (command) => {
    const ctx = { ...context(), commands: HACK_COMMANDS };
    expect(complete(command, ctx).options).toContain(command);
  });

  it('keeps host completion shell safe and respects the supplied allowlist', () => {
    const ctx = { ...context(), commands: HACK_COMMANDS, hosts: ['shop-pc', 'bakery-pc'] };
    expect(complete('connect "sh', ctx).value).toBe('connect "shop-pc" ');
    expect(complete('scan hq', ctx).options).toEqual([]);
    expect(complete('view-s', ctx).value).toBe('view-source ');
  });
});

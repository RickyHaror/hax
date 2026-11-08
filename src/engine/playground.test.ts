import { describe, expect, it } from 'vitest';
import type { StorageLike } from './progress';
import type { Playground } from './types';
import { clearPlayground, loadPlayground, PLAYGROUND_KEY, PlaygroundShell, savePlayground } from './playground';

const data: Playground = {
  unlockedBy: 't3-tools', cwd: '/home/agent', intro: [],
  fs: { type: 'dir', children: { home: { type: 'dir', children: { agent: { type: 'dir', children: {
    note: { type: 'file', content: 'Hello, pal.' },
    '.hidden': { type: 'file', content: 'A tiny secret.' },
    box: { type: 'dir', children: {} },
  } } } } } },
  commands: [{ name: 'whoami', help: 'See your name.', output: ['Hi, {name}! {name}!'] },
    { name: 'matrix', help: 'Green rain.', output: ['Rain!'], effect: 'matrix' }],
  eggs: [
    { id: 'read', name: 'Read', trigger: { type: 'read', path: '/home/agent/box/../note' }, found: [] },
    { id: 'cwd', name: 'Visit', trigger: { type: 'cwd', path: '/home//agent/box/.' }, found: [] },
    { id: 'command', name: 'Name', trigger: { type: 'command', command: 'whoami' }, found: [] },
  ],
};
function storage(): StorageLike {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); }, removeItem: (key) => { values.delete(key); } };
}
const text = (shell: PlaygroundShell, command: string) => shell.run(command).lines.map((line) => line.text).join('\n');

describe('playground discoveries', () => {
  it.each([
    ['read', 'cat ./box/../note'], ['cwd', 'cd ./box/../box'], ['command', 'WHOAMI'],
  ])('finds a %s egg once, using normalized paths and parsed commands', (id, command) => {
    const shell = new PlaygroundShell(data, 'Brave Otter', null);
    shell.run(command);
    expect(shell.found.map((egg) => egg.id)).toEqual([id]);
    expect(shell.discoveries.found).toEqual([id]);
    shell.run(command);
    expect(shell.found).toEqual([]);
    expect(shell.discoveries.found).toEqual([id]);
  });
  it('does not award eggs for failed reads, visits or commands', () => {
    const shell = new PlaygroundShell(data, 'Brave Otter', null);
    for (const command of ['cat missing', 'cd missing', 'whoami extra', 'whoami -a', 'lock note', 'cat note']) {
      shell.run(command);
      expect(shell.found).toEqual([]);
    }
    expect(shell.discoveries).toEqual({ found: [], discovered: [] });
  });
  it('replaces every name token and adds secrets to help only after discovery', () => {
    const shell = new PlaygroundShell(data, 'Brave Otter', null);
    expect(text(shell, 'help')).not.toMatch(/whoami|matrix/u);
    expect(text(shell, 'whoami')).toBe('Hi, Brave Otter! Brave Otter!');
    expect(text(shell, 'help')).toContain('whoami: See your name.');
    expect(text(shell, 'help')).not.toContain('matrix');
    expect(text(shell, 'help extra')).not.toContain('whoami');
    shell.run('matrix');
    expect(shell.effect).toBe('matrix');
    shell.run('pwd');
    expect(shell.effect).toBeUndefined();
  });
  it('keeps all learned commands and filesystem changes local to the session', () => {
    const shell = new PlaygroundShell(data, 'Brave Otter', null);
    expect(text(shell, 'ls')).toContain('box/');
    expect(text(shell, 'ls')).not.toContain('.hidden');
    expect(text(shell, 'ls -a')).toContain('.hidden');
    shell.run('cd box'); expect(text(shell, 'pwd')).toBe('/home/agent/box');
    shell.run('cd ..'); expect(text(shell, 'cat note')).toBe('Hello, pal.');
    expect(shell.run('clear').clear).toBe(true);
    shell.run('lock note'); expect(shell.fs.isLocked('note')).toBe(true);
    expect(new PlaygroundShell(data, 'Brave Otter', null).fs.isLocked('note')).toBe(false);
  });
  it('finds an egg at the starting cwd once', () => {
    const start: Playground = { ...data, eggs: [{ ...data.eggs[1]!, trigger: { type: 'cwd', path: data.cwd } }] };
    const saved = storage();
    expect(new PlaygroundShell(start, 'Pal', saved).found).toHaveLength(1);
    expect(new PlaygroundShell(start, 'Pal', saved).found).toHaveLength(0);
  });
});

describe('playground storage', () => {
  it('restores eggs and secret help separately from the mission save', () => {
    const saved = storage(); saved.setItem('hax.v1', 'mission save');
    const first = new PlaygroundShell(data, 'Pal', saved);
    first.run('cat note'); first.run('whoami');
    const restored = new PlaygroundShell(data, 'Pal', saved);
    expect(restored.discoveries).toEqual({ found: ['read', 'command'], discovered: ['whoami'] });
    expect(text(restored, 'help')).toContain('whoami');
    restored.run('whoami'); expect(restored.found).toEqual([]);
    expect(clearPlayground(saved)).toBe(true);
    expect(saved.getItem(PLAYGROUND_KEY)).toBeNull();
    expect(saved.getItem('hax.v1')).toBe('mission save');
    expect(loadPlayground(saved)).toEqual({ found: [], discovered: [] });
  });
  it('deduplicates stored IDs and ignores IDs outside current content', () => {
    const saved = storage();
    expect(savePlayground(saved, { found: ['read', 'read', 'old'], discovered: ['whoami', 'whoami', 'old'] })).toBe(true);
    expect(new PlaygroundShell(data, 'Pal', saved).discoveries).toEqual({ found: ['read'], discovered: ['whoami'] });
  });
  it.each(['oops', 'null', '[]', '{}', '{"found":[4],"discovered":[]}', '{"found":[],"discovered":false}'])(
    'loads empty state for corrupt storage: %s', (raw) => {
      const saved = storage(); saved.setItem(PLAYGROUND_KEY, raw);
      expect(loadPlayground(saved)).toEqual({ found: [], discovered: [] });
    },
  );
  it('handles absent and throwing storage without losing session discoveries', () => {
    const fail = () => { throw new Error('Storage is closed.'); };
    const saved: StorageLike = { getItem: fail, setItem: fail, removeItem: fail };
    for (const target of [null, undefined, saved]) {
      expect(loadPlayground(target)).toEqual({ found: [], discovered: [] });
      expect(savePlayground(target, { found: [], discovered: [] })).toBe(false);
      expect(clearPlayground(target)).toBe(false);
      const shell = new PlaygroundShell(data, 'Pal', target);
      shell.run('whoami'); expect(shell.discoveries.found).toEqual(['command']);
    }
  });
});

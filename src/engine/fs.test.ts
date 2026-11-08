import { describe, expect, it } from 'vitest';
import { HOME, VirtualFs } from './fs';
import type { FsResult, FsTreeNode } from './fs';
import type { FsDir, FsNode } from './types';

function dir(children: Record<string, FsNode> = {}): FsDir {
  return { type: 'dir', children };
}

function mission(): FsDir {
  return dir({
    home: dir({
      agent: dir({
        'zebra.txt': { type: 'file', content: 'Zebra' },
        'alpha.txt': { type: 'file', content: 'Alpha' },
        'locked.txt': { type: 'file', content: 'Secret', locked: true },
        '.secret': { type: 'file', content: 'Hidden' },
        '.cache': dir({ note: { type: 'file', content: 'Cached' } }),
        'my notes': { type: 'file', content: 'Spaces' },
        docs: dir({
          'note.txt': { type: 'file', content: 'Hello\nAgent' },
          '.draft': { type: 'file', content: '' },
          empty: dir(),
        }),
        backup: dir(),
        agentish: dir(),
      }),
      agentish: dir(),
    }),
    tmp: dir(),
    '.hidden': dir(),
    'root.txt': { type: 'file', content: 'Root', locked: false },
  });
}

function value<T>(result: FsResult<T>): T {
  if (!result.ok) throw new Error(`Unexpected ${result.error.kind}: ${result.error.path}`);
  return result.value;
}

function flatten(node: FsTreeNode): FsTreeNode[] {
  return [node, ...(node.children ?? []).flatMap(flatten)];
}

describe('VirtualFs construction and isolation', () => {
  it('exports the home path and starts there when it is a directory', () => {
    expect(HOME).toBe('/home/agent');
    expect(new VirtualFs(mission()).cwd()).toBe(HOME);
  });

  it.each(['/tmp', '/home//agent/docs/../docs/', '~'])('accepts cwd %s', (cwd) => {
    const fs = new VirtualFs(mission(), cwd);
    expect(fs.cwd()).toBe(cwd === '/tmp' ? '/tmp' : cwd === '~' ? HOME : `${HOME}/docs`);
  });

  it.each(['', '/missing', '/root.txt', '/root.txt/child'])('falls back for invalid cwd %s', (cwd) => {
    expect(new VirtualFs(mission(), cwd).cwd()).toBe(HOME);
  });

  it('falls back to root when home is missing or a file', () => {
    expect(new VirtualFs(dir()).cwd()).toBe('/');
    const root = dir({ home: dir({ agent: { type: 'file', content: '' } }) });
    expect(new VirtualFs(root).cwd()).toBe('/');
    expect(new VirtualFs(root, '/missing').cwd()).toBe('/');
    expect(new VirtualFs(mission(), '/').cwd()).toBe('/');
  });

  it('never changes mission data when locking and removing nested files', () => {
    const root = mission();
    const original = structuredClone(root);
    const fs = new VirtualFs(root);
    expect(fs.lock('docs/note.txt')).toEqual({ ok: true, value: undefined });
    expect(fs.remove('alpha.txt')).toEqual({ ok: true, value: undefined });
    expect(root).toEqual(original);
    expect(new VirtualFs(root).read('docs/note.txt')).toEqual({ ok: true, value: 'Hello\nAgent' });
    expect(new VirtualFs(root).exists('alpha.txt')).toBe(true);
  });

  it('does not observe later changes to the input data', () => {
    const root = mission();
    const fs = new VirtualFs(root);
    root.children.home = dir();
    root.children.extra = dir();
    expect(fs.read('alpha.txt')).toEqual({ ok: true, value: 'Alpha' });
    expect(fs.exists('/extra')).toBe(false);
  });

  it('returns detached snapshots preserving file contents and optional locks', () => {
    const fs = new VirtualFs(mission());
    const snapshot = fs.snapshot();
    expect(snapshot).toEqual(mission());
    expect(snapshot).not.toBe(fs.snapshot());
    const copy = new VirtualFs(snapshot);
    copy.lock('alpha.txt');
    copy.remove('docs/note.txt');
    const home = snapshot.children.home as FsDir;
    home.children.agent = dir();
    expect(fs.read('alpha.txt')).toEqual({ ok: true, value: 'Alpha' });
    expect(fs.exists('docs/note.txt')).toBe(true);
    expect(fs.snapshot().children.home).toEqual(mission().children.home);
  });
});

describe('path resolution and navigation', () => {
  it.each([
    ['', HOME],
    ['/', '/'],
    ['//', '/'],
    ['///home//agent///docs/', `${HOME}/docs`],
    ['.', HOME],
    ['./docs/./empty/', `${HOME}/docs/empty`],
    ['docs/../backup', `${HOME}/backup`],
    ['..', '/home'],
    ['a/../../..', '/'],
    ['../../../../tmp', '/tmp'],
    ['~', HOME],
    ['~/x', `${HOME}/x`],
    ['~//docs/../', HOME],
    ['~/../../tmp', '/tmp'],
    ['~agent', `${HOME}/~agent`],
    ['docs/~', `${HOME}/docs/~`],
    ['...', `${HOME}/...`],
    ['my notes', `${HOME}/my notes`],
    [' ', `${HOME}/ `],
    ['missing/../docs', `${HOME}/docs`],
  ])('resolves %j to %s without looking it up', (path, expected) => {
    const fs = new VirtualFs(mission());
    expect(fs.resolve(path)).toBe(expected);
    expect(fs.cwd()).toBe(HOME);
  });

  it('uses the updated cwd for relative paths and clamps parents at root', () => {
    const fs = new VirtualFs(mission());
    expect(fs.cd('docs')).toEqual({ ok: true, value: `${HOME}/docs` });
    expect(fs.resolve('note.txt')).toBe(`${HOME}/docs/note.txt`);
    expect(fs.cd('../backup')).toEqual({ ok: true, value: `${HOME}/backup` });
    expect(fs.cd('/../../..')).toEqual({ ok: true, value: '/' });
    expect(fs.cd('..')).toEqual({ ok: true, value: '/' });
    expect(fs.cd('~')).toEqual({ ok: true, value: HOME });
    fs.cd('/tmp');
    expect(fs.cd()).toEqual({ ok: true, value: HOME });
  });

  it('keeps cwd when navigation fails, including when home is missing', () => {
    const fs = new VirtualFs(mission(), '/tmp');
    expect(fs.cd('/missing')).toEqual({ ok: false, error: { kind: 'not-found', path: '/missing' } });
    expect(fs.cwd()).toBe('/tmp');
    const empty = new VirtualFs(dir({ tmp: dir() }), '/tmp');
    expect(empty.cd()).toEqual({ ok: false, error: { kind: 'not-found', path: HOME } });
    expect(empty.cd('~')).toEqual({ ok: false, error: { kind: 'not-found', path: HOME } });
    expect(empty.cwd()).toBe('/tmp');
  });

  it('uses case-sensitive names', () => {
    const fs = new VirtualFs(mission());
    expect(fs.exists('Alpha.txt')).toBe(false);
    expect(fs.isDir('Docs')).toBe(false);
    expect(fs.read('alpha.txt')).toEqual({ ok: true, value: 'Alpha' });
  });
});

describe('listing and reading', () => {
  it('lists directories first and sorts each group alphabetically', () => {
    const fs = new VirtualFs(mission());
    expect(value(fs.list()).map((item) => item.name)).toEqual([
      'agentish', 'backup', 'docs', 'alpha.txt', 'locked.txt', 'my notes', 'zebra.txt',
    ]);
    expect(value(fs.list('docs'))).toEqual([
      { name: 'empty', type: 'dir', hidden: false, locked: false },
      { name: 'note.txt', type: 'file', hidden: false, locked: false },
    ]);
    expect(fs.cwd()).toBe(HOME);
    fs.cd('docs/empty');
    expect(fs.list()).toEqual({ ok: true, value: [] });
  });

  it('sorts without case sensitivity and breaks ties consistently', () => {
    const nodes: [string, FsNode][] = ['beta', 'Beta', 'alpha', 'Alpha', 'Zebra'].map((name) =>
      [name, { type: 'file', content: name }]);
    const names = (entries: [string, FsNode][]) =>
      value(new VirtualFs(dir(Object.fromEntries(entries))).list()).map((item) => item.name);
    const sorted = names(nodes);
    expect(sorted.map((name) => name.toLowerCase())).toEqual(['alpha', 'alpha', 'beta', 'beta', 'zebra']);
    expect(names([...nodes].reverse())).toEqual(sorted);
  });

  it('includes hidden files and directories only with all enabled', () => {
    const fs = new VirtualFs(mission());
    const all = value(fs.list(undefined, { all: true }));
    expect(all.map((item) => item.name)).toEqual([
      '.cache', 'agentish', 'backup', 'docs', '.secret', 'alpha.txt', 'locked.txt', 'my notes', 'zebra.txt',
    ]);
    expect(all.find((item) => item.name === '.cache')).toEqual({
      name: '.cache', type: 'dir', hidden: true, locked: false,
    });
    expect(all.find((item) => item.name === '.secret')).toEqual({
      name: '.secret', type: 'file', hidden: true, locked: false,
    });
    expect(all.find((item) => item.name === 'locked.txt')?.locked).toBe(true);
    expect(fs.list(undefined, { all: false })).toEqual(fs.list());
    expect(fs.read('.secret')).toEqual({ ok: true, value: 'Hidden' });
    expect(fs.list('.cache')).toEqual({
      ok: true, value: [{ name: 'note', type: 'file', hidden: false, locked: false }],
    });
  });

  it('reads exact contents including empty files, spaces, and absolute paths', () => {
    const fs = new VirtualFs(mission());
    expect(fs.read('docs/note.txt')).toEqual({ ok: true, value: 'Hello\nAgent' });
    expect(fs.read('docs/.draft')).toEqual({ ok: true, value: '' });
    expect(fs.read('my notes')).toEqual({ ok: true, value: 'Spaces' });
    expect(fs.read('/root.txt')).toEqual({ ok: true, value: 'Root' });
  });

  it('returns detached listing entries', () => {
    const fs = new VirtualFs(mission());
    const entries = value(fs.list());
    entries[0]!.name = 'changed';
    entries[0]!.locked = true;
    entries.length = 0;
    expect(value(fs.list())[0]).toEqual({ name: 'agentish', type: 'dir', hidden: false, locked: false });
  });
});

describe('file mutations and queries', () => {
  it('locks files idempotently and exposes the lock everywhere', () => {
    const fs = new VirtualFs(mission());
    expect(fs.isLocked('alpha.txt')).toBe(false);
    expect(fs.lock('./alpha.txt')).toEqual({ ok: true, value: undefined });
    expect(fs.lock('alpha.txt')).toEqual({ ok: true, value: undefined });
    expect(fs.isLocked('alpha.txt')).toBe(true);
    expect(fs.read('alpha.txt')).toEqual({ ok: false, error: { kind: 'locked', path: `${HOME}/alpha.txt` } });
    expect(value(fs.list()).find((item) => item.name === 'alpha.txt')?.locked).toBe(true);
    expect(flatten(fs.tree()).find((node) => node.path === `${HOME}/alpha.txt`)?.locked).toBe(true);
    expect(new VirtualFs(fs.snapshot()).isLocked('alpha.txt')).toBe(true);
  });

  it('removes only the requested unlocked file and updates all views', () => {
    const fs = new VirtualFs(mission());
    expect(fs.remove('./docs//note.txt/')).toEqual({ ok: true, value: undefined });
    expect(fs.exists('docs/note.txt')).toBe(false);
    expect(fs.read('docs/note.txt')).toEqual({
      ok: false, error: { kind: 'not-found', path: `${HOME}/docs/note.txt` },
    });
    expect(value(fs.list('docs')).map((item) => item.name)).toEqual(['empty']);
    expect(flatten(fs.tree({ all: true })).some((node) => node.name === 'note.txt')).toBe(false);
    expect(new VirtualFs(fs.snapshot()).exists('docs/note.txt')).toBe(false);
    expect(fs.exists('docs/.draft')).toBe(true);
    expect(fs.cwd()).toBe(HOME);
    expect(fs.remove('.secret')).toEqual({ ok: true, value: undefined });
    expect(fs.remove('/root.txt')).toEqual({ ok: true, value: undefined });
    expect(fs.exists('/root.txt')).toBe(false);
  });

  it.each([
    ['/', true, true, false],
    ['.', true, true, false],
    ['docs', true, true, false],
    ['.secret', true, false, false],
    ['alpha.txt', true, false, false],
    ['locked.txt', true, false, true],
    ['missing', false, false, false],
    ['alpha.txt/child', false, false, false],
    ['', false, false, false],
  ] as const)('queries %j correctly', (path, exists, isDir, isLocked) => {
    const fs = new VirtualFs(mission());
    expect(fs.exists(path)).toBe(exists);
    expect(fs.isDir(path)).toBe(isDir);
    expect(fs.isLocked(path)).toBe(isLocked);
  });
});

describe('typed errors', () => {
  const methods = ['cd', 'list', 'read', 'lock', 'remove'] as const;

  it.each(methods)('%s rejects an empty path', (method) => {
    const fs = new VirtualFs(mission());
    expect(fs[method]('')).toEqual({ ok: false, error: { kind: 'bad-path', path: '' } });
  });

  it.each(methods)('%s reports the full normalized missing path', (method) => {
    const fs = new VirtualFs(mission());
    expect(fs[method]('./missing//deep/../file/')).toEqual({
      ok: false, error: { kind: 'not-found', path: `${HOME}/missing/file` },
    });
  });

  it.each(methods)('%s rejects paths passing through files', (method) => {
    const fs = new VirtualFs(mission());
    expect(fs[method]('./alpha.txt//child/')).toEqual({
      ok: false, error: { kind: 'not-a-dir', path: `${HOME}/alpha.txt/child` },
    });
  });

  it.each(['cd', 'list'] as const)('%s rejects a file', (method) => {
    const fs = new VirtualFs(mission());
    expect(fs[method]('locked.txt')).toEqual({
      ok: false, error: { kind: 'not-a-dir', path: `${HOME}/locked.txt` },
    });
  });

  it.each(['read', 'lock', 'remove'] as const)('%s rejects directories including root', (method) => {
    const fs = new VirtualFs(mission());
    for (const path of ['/', 'docs', '.']) {
      expect(fs[method](path)).toEqual({ ok: false, error: { kind: 'is-a-dir', path: fs.resolve(path) } });
    }
  });

  it.each(['read', 'remove'] as const)('%s refuses a locked file without changing state', (method) => {
    const fs = new VirtualFs(mission());
    const before = fs.snapshot();
    expect(fs[method]('./locked.txt')).toEqual({
      ok: false, error: { kind: 'locked', path: `${HOME}/locked.txt` },
    });
    expect(fs.snapshot()).toEqual(before);
  });

  it('leaves the entire state untouched after failed operations', () => {
    const fs = new VirtualFs(mission());
    const before = fs.snapshot();
    for (const method of methods) {
      for (const path of ['', 'missing', 'alpha.txt/child']) fs[method](path);
    }
    expect(fs.snapshot()).toEqual(before);
    expect(fs.cwd()).toBe(HOME);
  });
});

describe('tree', () => {
  it('marks cwd and only its ancestors after navigation', () => {
    const fs = new VirtualFs(mission());
    expect(flatten(fs.tree()).filter((node) => node.isCwd).map((node) => node.path)).toEqual([HOME]);
    fs.cd('docs/empty');
    const nodes = flatten(fs.tree());
    expect(nodes.filter((node) => node.isCwd).map((node) => node.path)).toEqual([`${HOME}/docs/empty`]);
    expect(nodes.filter((node) => node.onCwdPath).map((node) => node.path)).toEqual([
      '/', '/home', HOME, `${HOME}/docs`, `${HOME}/docs/empty`,
    ]);
    fs.cd('/');
    expect(flatten(fs.tree()).filter((node) => node.onCwdPath).map((node) => node.path)).toEqual(['/']);
  });

  it('uses list ordering, normalized paths, and children only on directories', () => {
    const fs = new VirtualFs(mission());
    const tree = fs.tree({ all: true });
    expect(tree).toMatchObject({ name: '/', path: '/', type: 'dir', hidden: false, locked: false });
    for (const node of flatten(tree)) {
      expect(node.path).toBe(fs.resolve(node.path));
      if (node.type === 'dir') {
        expect(node.children?.map((child) => child.name)).toEqual(
          value(fs.list(node.path, { all: true })).map((item) => item.name),
        );
      } else {
        expect(node).not.toHaveProperty('children');
        expect(node.isCwd).toBe(false);
        expect(node.onCwdPath).toBe(false);
      }
    }
  });

  it('hides entire hidden subtrees by default and marks hidden cwd with all', () => {
    const fs = new VirtualFs(mission());
    fs.cd('.cache');
    expect(flatten(fs.tree()).every((node) => !node.hidden)).toBe(true);
    expect(flatten(fs.tree()).some((node) => node.path.includes('.cache'))).toBe(false);
    const nodes = flatten(fs.tree({ all: true }));
    expect(nodes.find((node) => node.path === `${HOME}/.cache`)).toMatchObject({
      hidden: true, locked: false, isCwd: true, onCwdPath: true,
    });
    expect(nodes.find((node) => node.path === `${HOME}/.cache/note`)?.hidden).toBe(false);
    expect(nodes.find((node) => node.path === `${HOME}/.secret`)?.hidden).toBe(true);
    expect(fs.tree({ all: false })).toEqual(fs.tree());
  });

  it('returns detached trees and represents empty root', () => {
    const fs = new VirtualFs(mission());
    const tree = fs.tree();
    tree.children![0]!.name = 'changed';
    tree.children!.length = 0;
    expect(fs.tree().children!.length).toBeGreaterThan(0);
    expect(fs.exists('/home')).toBe(true);
    expect(fs.exists('/changed')).toBe(false);
    expect(new VirtualFs(dir()).tree()).toEqual({
      name: '/', path: '/', type: 'dir', hidden: false, locked: false,
      isCwd: true, onCwdPath: true, children: [],
    });
  });
});

describe('unusual string inputs', () => {
  it.each([
    '', '/', '//', '...', '~', '~/x', 'a/../../..', 'my notes', ' ',
    '__proto__', 'constructor', 'toString', '\0', '\\home\\agent',
    'hello\nworld', '🐱', '/'.repeat(1000), 'x/'.repeat(1000),
  ])('no method throws for %j', (path) => {
    const fs = new VirtualFs(mission());
    expect(() => {
      new VirtualFs(mission(), path);
      fs.resolve(path);
      fs.cd(path);
      fs.list(path);
      fs.list(path, { all: true });
      fs.read(path);
      fs.lock(path);
      fs.remove(path);
      fs.exists(path);
      fs.isDir(path);
      fs.isLocked(path);
      fs.cwd();
      fs.tree();
      fs.tree({ all: true });
      fs.snapshot();
    }).not.toThrow();
  });

  it('does not treat inherited object properties as entries', () => {
    const fs = new VirtualFs(dir());
    for (const name of ['__proto__', 'constructor', 'toString']) {
      expect(fs.exists(name)).toBe(false);
      expect(fs.read(name)).toEqual({ ok: false, error: { kind: 'not-found', path: `/${name}` } });
    }
  });

  it('supports own entries named like object properties', () => {
    const root = dir(Object.fromEntries(['__proto__', 'constructor', 'toString'].map((name) =>
      [name, { type: 'file', content: name }])));
    const fs = new VirtualFs(root);
    expect(fs.read('__proto__')).toEqual({ ok: true, value: '__proto__' });
    expect(fs.lock('constructor')).toEqual({ ok: true, value: undefined });
    expect(fs.isLocked('constructor')).toBe(true);
    expect(fs.remove('toString')).toEqual({ ok: true, value: undefined });
    expect(fs.exists('toString')).toBe(false);
    expect(root).toEqual(dir(Object.fromEntries(['__proto__', 'constructor', 'toString'].map((name) =>
      [name, { type: 'file', content: name }]))));
  });
});

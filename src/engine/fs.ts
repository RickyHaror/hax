import type { FsDir, FsFile, FsNode } from './types';

export const HOME = '/home/agent';

export type FsError =
  | { kind: 'not-found'; path: string }
  | { kind: 'not-a-dir'; path: string }
  | { kind: 'is-a-dir'; path: string }
  | { kind: 'locked'; path: string }
  | { kind: 'bad-path'; path: string };

export type FsResult<T> = { ok: true; value: T } | { ok: false; error: FsError };

export interface FsEntry {
  name: string;
  type: 'file' | 'dir';
  hidden: boolean;
  locked: boolean;
}

export interface FsTreeNode extends FsEntry {
  path: string;
  isCwd: boolean;
  onCwdPath: boolean;
  children?: FsTreeNode[];
}

function failure(kind: FsError['kind'], path: string): FsResult<never> {
  return { ok: false, error: { kind, path } };
}

function entry(name: string, node: FsNode): FsEntry {
  return {
    name,
    type: node.type,
    hidden: name.startsWith('.'),
    locked: node.type === 'file' && node.locked === true,
  };
}

function children(dir: FsDir, all: boolean): [string, FsNode][] {
  return Object.entries(dir.children)
    .filter(([name]) => all || !name.startsWith('.'))
    .sort(([a, left], [b, right]) => {
      if (left.type !== right.type) return left.type === 'dir' ? -1 : 1;
      return a.localeCompare(b, undefined, { sensitivity: 'base' })
        || a.localeCompare(b)
        || (a < b ? -1 : a > b ? 1 : 0);
    });
}

export class VirtualFs {
  private readonly root: FsDir;
  private current = '/';

  constructor(root: FsDir, cwd?: string) {
    this.root = structuredClone(root);
    const fallback = this.isDir(HOME) ? HOME : '/';
    this.current = cwd !== undefined && this.isDir(cwd) ? this.resolve(cwd) : fallback;
  }

  cwd(): string {
    return this.current;
  }

  resolve(path: string): string {
    const expanded = path === '~' || path.startsWith('~/') ? HOME + path.slice(1) : path;
    const parts = (expanded.startsWith('/') ? expanded : `${this.current}/${expanded}`).split('/');
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '..') resolved.pop();
      else if (part !== '' && part !== '.') resolved.push(part);
    }
    return `/${resolved.join('/')}`;
  }

  cd(path = HOME): FsResult<string> {
    const result = this.find(path);
    if (!result.ok) return result;
    if (result.value.type !== 'dir') return failure('not-a-dir', this.resolve(path));
    this.current = this.resolve(path);
    return { ok: true, value: this.current };
  }

  list(path = this.current, opts?: { all?: boolean }): FsResult<FsEntry[]> {
    const result = this.find(path);
    if (!result.ok) return result;
    if (result.value.type !== 'dir') return failure('not-a-dir', this.resolve(path));
    return { ok: true, value: children(result.value, opts?.all === true).map(([name, node]) => entry(name, node)) };
  }

  read(path: string): FsResult<string> {
    const result = this.file(path);
    if (!result.ok) return result;
    if (result.value.locked) return failure('locked', this.resolve(path));
    return { ok: true, value: result.value.content };
  }

  lock(path: string): FsResult<void> {
    const result = this.file(path);
    if (!result.ok) return result;
    result.value.locked = true;
    return { ok: true, value: undefined };
  }

  remove(path: string): FsResult<void> {
    const result = this.file(path);
    if (!result.ok) return result;
    if (result.value.locked) return failure('locked', this.resolve(path));
    const absolute = this.resolve(path);
    const slash = absolute.lastIndexOf('/');
    const parent = this.find(absolute.slice(0, slash) || '/');
    if (!parent.ok) return parent;
    if (parent.value.type !== 'dir') return failure('not-a-dir', absolute);
    delete parent.value.children[absolute.slice(slash + 1)];
    return { ok: true, value: undefined };
  }

  exists(path: string): boolean {
    return this.find(path).ok;
  }

  isDir(path: string): boolean {
    const result = this.find(path);
    return result.ok && result.value.type === 'dir';
  }

  isLocked(path: string): boolean {
    const result = this.find(path);
    return result.ok && result.value.type === 'file' && result.value.locked === true;
  }

  tree(opts?: { all?: boolean }): FsTreeNode {
    return this.treeNode('/', '/', this.root, opts?.all === true);
  }

  snapshot(): FsDir {
    return structuredClone(this.root);
  }

  private find(path: string): FsResult<FsNode> {
    if (path === '') return failure('bad-path', path);
    const absolute = this.resolve(path);
    let node: FsNode = this.root;
    for (const part of absolute.split('/').filter(Boolean)) {
      if (node.type !== 'dir') return failure('not-a-dir', absolute);
      if (!Object.hasOwn(node.children, part)) return failure('not-found', absolute);
      node = node.children[part]!;
    }
    return { ok: true, value: node };
  }

  private file(path: string): FsResult<FsFile> {
    const result = this.find(path);
    if (!result.ok) return result;
    return result.value.type === 'dir'
      ? failure('is-a-dir', this.resolve(path))
      : { ok: true, value: result.value };
  }

  private treeNode(name: string, path: string, node: FsNode, all: boolean): FsTreeNode {
    const result: FsTreeNode = {
      ...entry(name, node),
      path,
      isCwd: path === this.current,
      onCwdPath: path === '/' || path === this.current || this.current.startsWith(`${path}/`),
    };
    if (node.type === 'dir') {
      result.children = children(node, all).map(([childName, child]) =>
        this.treeNode(childName, `${path === '/' ? '' : path}/${childName}`, child, all));
    }
    return result;
  }
}

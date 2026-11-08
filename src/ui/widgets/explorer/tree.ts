import type { FsDir, FsNode } from '../../../engine/types';

export function joinPath(folder: string, name: string): string {
  const parts: string[] = [];
  for (const part of `${folder}/${name}`.split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  return `/${parts.join('/')}`;
}

export function findNode(tree: FsDir, path: string): FsNode | undefined {
  let node: FsNode | undefined = tree;
  for (const part of joinPath('/', path).split('/').filter(Boolean)) {
    node = node?.type === 'dir' && Object.hasOwn(node.children, part)
      ? node.children[part] : undefined;
  }
  return node;
}

export function listFolder(tree: FsDir, path: string) {
  const folder = findNode(tree, path);
  if (folder?.type !== 'dir') return [];
  return Object.entries(folder.children).map(([name, node]) => ({
    name, node, path: joinPath(path, name),
  })).sort((a, b) => a.node.type === b.node.type
    ? a.name.localeCompare(b.name) : a.node.type === 'dir' ? -1 : 1);
}

export function parentPath(path: string): string {
  return path.slice(0, path.lastIndexOf('/')) || '/';
}

export function folderName(path: string): string {
  return path === '/' ? 'This computer' : path.slice(path.lastIndexOf('/') + 1);
}

export function breadcrumbs(path: string) {
  const result = [{ path: '/', name: 'This computer' }];
  for (const name of path.split('/').filter(Boolean)) {
    result.push({ path: joinPath(result[result.length - 1]!.path, name), name });
  }
  return result;
}

export function applyMove(tree: FsDir, file: string, toDir: string): FsDir | undefined {
  const source = findNode(tree, file);
  const target = findNode(tree, toDir);
  const name = folderName(file);
  if (source?.type !== 'file' || target?.type !== 'dir'
    || Object.hasOwn(target.children, name)) return undefined;
  const next = structuredClone(tree);
  const from = findNode(next, parentPath(file));
  const to = findNode(next, toDir);
  if (from?.type !== 'dir' || to?.type !== 'dir') return undefined;
  Object.defineProperty(to.children, name, {
    value: from.children[name], enumerable: true, configurable: true, writable: true,
  });
  delete from.children[name];
  return next;
}

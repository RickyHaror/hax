import { HOME, type FsTreeNode, type VirtualFs } from '../../../engine/fs';

function find(node: FsTreeNode, path: string): FsTreeNode | undefined {
  if (node.path === path) return node;
  for (const child of node.children ?? []) {
    const result = find(child, path);
    if (result) return result;
  }
}

function Branch({ node }: { node: FsTreeNode }) {
  return <li>
    <span class="terminal-tree-entry" aria-current={node.isCwd ? 'true' : undefined}>
      <span aria-hidden="true">{node.type === 'dir' ? '📁' : '📄'}</span>
      <span>{node.name}</span>
      {node.locked && <span role="img" aria-label="Locked">🔒</span>}
    </span>
    {!!node.children?.length && <ul>{node.children.map((child) => <Branch key={child.path} node={child} />)}</ul>}
  </li>;
}

export function FolderTree({ fs, hidden }: { fs: VirtualFs; hidden: boolean }) {
  const tree = fs.tree({ all: hidden });
  const cwd = fs.cwd();
  const rootPath = cwd === HOME || cwd.startsWith(`${HOME}/`) ? HOME : `/${cwd.split('/')[1] ?? ''}`;
  const root = find(tree, rootPath) ?? tree;
  return <aside class="terminal-folders" aria-label="Folders" tabIndex={0}>
    <h3>Folders</h3><ul><Branch node={root} /></ul>
  </aside>;
}

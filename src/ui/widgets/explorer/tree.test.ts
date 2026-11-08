import { describe, expect, it } from 'vitest';
import type { FsDir } from '../../../engine/types';
import { applyMove, breadcrumbs, findNode, joinPath, listFolder } from './tree';

const tree: FsDir = { type: 'dir', children: {
  'Cat picture': { type: 'file', content: 'A cat.' },
  Pictures: { type: 'dir', children: {} },
  Music: { type: 'dir', children: { Song: { type: 'file', content: 'La!' } } },
} };
describe('explorer tree', () => {
  it('joins root and nested paths without losing spaces', () => {
    expect(joinPath('/', 'Cat picture')).toBe('/Cat picture');
    expect(joinPath('/Pictures/', './Cat picture')).toBe('/Pictures/Cat picture');
    expect(joinPath('/Music', '../Pictures')).toBe('/Pictures');
    expect(breadcrumbs('/Pictures/Cat folder')).toEqual([
      { path: '/', name: 'This computer' }, { path: '/Pictures', name: 'Pictures' },
      { path: '/Pictures/Cat folder', name: 'Cat folder' },
    ]);
  });
  it('lists folders first and returns no children for files or missing paths', () => {
    expect(listFolder(tree, '/').map((entry) => entry.name)).toEqual(['Music', 'Pictures', 'Cat picture']);
    expect(listFolder(tree, '/Music')[0]?.path).toBe('/Music/Song');
    expect(listFolder(tree, '/Cat picture')).toEqual([]);
    expect(listFolder(tree, '/missing')).toEqual([]);
    expect(findNode(tree, '/toString')).toBeUndefined();
  });
  it('moves a file immutably and keeps its content', () => {
    const next = applyMove(tree, '/Cat picture', '/Pictures')!;
    expect(findNode(next, '/Cat picture')).toBeUndefined();
    expect(findNode(next, '/Pictures/Cat picture')).toEqual({ type: 'file', content: 'A cat.' });
    expect(findNode(tree, '/Cat picture')).toBeDefined();
    expect(findNode(tree, '/Pictures/Cat picture')).toBeUndefined();
  });
  it('refuses missing sources, folder sources, file targets, and collisions', () => {
    expect(applyMove(tree, '/missing', '/Pictures')).toBeUndefined();
    expect(applyMove(tree, '/Music', '/Pictures')).toBeUndefined();
    expect(applyMove(tree, '/Cat picture', '/Music/Song')).toBeUndefined();
    expect(applyMove(tree, '/Cat picture', '/')).toBeUndefined();
  });
});

import { speechCatalog } from '../../speech-catalog';
import { useRef, useState } from 'preact/hooks';
import type { FileExplorerConfig } from '../../../engine/types';
import type { WidgetProps } from '../Widget';
import { useStore } from '../../store';
import { applyMove, findNode } from './tree';
import { useFinish } from './useFinish';
import { useExplorerReveal } from './useExplorerReveal';

export function useExplorer({ config, showMe, onComplete }: WidgetProps<FileExplorerConfig>) {
  const store = useStore();
  const revealCount = store.revealCount.value;
  const { completed, finish } = useFinish(onComplete);
  const [tree, setTree] = useState(() => structuredClone(config.fs));
  const currentTree = useRef(tree);
  const done = useRef(new Set<number>());
  const [folder, setFolder] = useState('/');
  const [selected, setSelected] = useState<string | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [highlight, setHighlight] = useState<string | null>(null);
  function navigate(path: string) {
    setFolder(path); setSelected(null); setViewer(null); setMessage('');
  }
  function open(path: string) {
    const node = findNode(currentTree.current, path);
    if (!node) return;
    if (node.type === 'file' && node.locked) {
      setMessage(speechCatalog.explorer.locked.text);
      store.sound.play('tryAgain'); return;
    }
    if (node.type === 'dir') navigate(path);
    else { setViewer(path); setMessage(''); }
    if (config.task.type === 'open' && path === config.task.path) finish();
  }
  function select(path: string) {
    setSelected(path);
    setMessage(findNode(currentTree.current, path)?.type === 'dir'
      ? speechCatalog.explorer.openFolder.text : speechCatalog.explorer.openFile.text);
    store.sound.play('click');
  }
  function move(file: string, toDir: string) {
    if (completed.current || config.task.type !== 'move') return;
    const index = config.task.moves.findIndex((item, i) =>
      !done.current.has(i) && item.file === file && item.toDir === toDir);
    const next = index < 0 ? undefined : applyMove(currentTree.current, file, toDir);
    if (!next) {
      setMessage(speechCatalog.explorer.wrongHome.text);
      store.sound.play('tryAgain'); return;
    }
    currentTree.current = next; setTree(next); done.current.add(index);
    setSelected(null); setViewer(null); setMessage(speechCatalog.explorer.moved.text);
    if (done.current.size === config.task.moves.length) finish();
    else store.sound.play('success');
  }
  useExplorerReveal({ config, showMe, revealCount, done, completed, navigate, open, move, setHighlight });
  return { tree, folder, selected, viewer, message, highlight, navigate, open, select, move,
    closeFile: () => setViewer(null) };
}

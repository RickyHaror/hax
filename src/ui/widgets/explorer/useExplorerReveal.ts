import { useEffect, useRef } from 'preact/hooks';
import type { FileExplorerConfig } from '../../../engine/types';
import { parentPath } from './tree';

interface RevealProps {
  config: FileExplorerConfig; showMe: boolean; revealCount: number;
  done: { current: Set<number> }; completed: { current: boolean };
  navigate: (path: string) => void;
  open: (path: string) => void;
  move: (file: string, toDir: string) => void;
  setHighlight: (path: string | null) => void;
}
export function useExplorerReveal(props: RevealProps) {
  const actions = useRef(props);
  actions.current = props;
  const { config, showMe, revealCount } = props;
  useEffect(() => {
    if (!showMe || actions.current.completed.current) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const paths: { file: string; toDir?: string }[] = config.task.type === 'open'
      ? [{ file: config.task.path }]
      : config.task.moves.filter((_, i) => !actions.current.done.current.has(i));
    paths.forEach((item, i) => {
      const highlight = () => {
        if (actions.current.completed.current) return;
        actions.current.navigate(parentPath(item.file));
        actions.current.setHighlight(item.file);
      };
      if (i === 0) highlight();
      else timers.push(setTimeout(highlight, i * 1000));
      timers.push(setTimeout(() => {
        if (actions.current.completed.current) return;
        if (item.toDir !== undefined) {
          const task = actions.current.config.task;
          const index = task.type === 'move' ? task.moves.findIndex((move) =>
            move.file === item.file && move.toDir === item.toDir) : -1;
          if (!actions.current.done.current.has(index)) actions.current.move(item.file, item.toDir);
        } else actions.current.open(item.file);
        actions.current.setHighlight(null);
      }, i * 1000 + 600));
    });
    return () => timers.forEach(clearTimeout);
  }, [config, showMe, revealCount]);
}

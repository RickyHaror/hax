import { useEffect, useRef, useState } from 'preact/hooks';
import type { TargetedPointerEvent } from 'preact';

interface Drag {
  file: string; pointerId: number; startX: number; startY: number;
  x: number; y: number; moved: boolean;
}
export function useFileDrag(move: (file: string, folder: string) => void) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const current = useRef<Drag | null>(null);
  const suppressClick = useRef<string | null>(null);
  const moveFile = useRef(move);
  moveFile.current = move;
  useEffect(() => {
    function update(event: PointerEvent) {
      const value = current.current;
      if (!value || value.pointerId !== event.pointerId) return;
      const x = event.clientX - value.startX;
      const y = event.clientY - value.startY;
      current.current = { ...value, x, y, moved: value.moved || Math.hypot(x, y) > 6 };
      if (current.current.moved) event.preventDefault();
      setDrag(current.current);
    }
    function end(event: PointerEvent) {
      const value = current.current;
      if (!value || value.pointerId !== event.pointerId) return;
      current.current = null; setDrag(null);
      if (!value.moved || event.type === 'pointercancel') return;
      suppressClick.current = value.file;
      const hit = document.elementFromPoint?.(event.clientX, event.clientY);
      const target = hit ?? (event.target instanceof Element ? event.target : null);
      moveFile.current(value.file, target?.closest('[data-folder]')?.getAttribute('data-folder') ?? '');
    }
    window.addEventListener('pointermove', update, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', update);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);
  function start(event: TargetedPointerEvent<HTMLButtonElement>, file: string) {
    if (event.button !== 0) return;
    suppressClick.current = null;
    const value = { file, pointerId: event.pointerId, startX: event.clientX,
      startY: event.clientY, x: 0, y: 0, moved: false };
    current.current = value; setDrag(value);
  }
  function takeClick(path: string, fromPointer: boolean) {
    const suppressed = fromPointer && suppressClick.current === path;
    suppressClick.current = null;
    return !suppressed;
  }
  return { drag, start, takeClick };
}

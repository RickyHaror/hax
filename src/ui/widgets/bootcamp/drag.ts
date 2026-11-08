import type { TargetedPointerEvent } from 'preact';
import { useRef, useState } from 'preact/hooks';
type Pointer = TargetedPointerEvent<HTMLButtonElement>;
interface Drag { id: string; pointerId: number; x: number; y: number; moved: boolean }
export function useDrag(drop: (id: string, zone: string | undefined) => void) {
  const active = useRef<Drag | null>(null);
  const suppressClick = useRef<string | null>(null);
  const [offset, setOffset] = useState({ id: '', x: 0, y: 0 });
  function start(event: Pointer, id: string) {
    if (event.button !== 0 || active.current) return;
    suppressClick.current = null;
    active.current = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: Pointer) {
    const drag = active.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const x = event.clientX - drag.x, y = event.clientY - drag.y;
    drag.moved ||= Math.hypot(x, y) > 5;
    if (drag.moved) setOffset({ id: drag.id, x, y });
  }
  function end(event: Pointer, cancel = false) {
    const drag = active.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    active.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved || cancel) {
      suppressClick.current = drag.id;
      const zone = cancel ? undefined : document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-bc-zone]')?.dataset.bcZone;
      drop(drag.id, zone);
    }
    setOffset({ id: '', x: 0, y: 0 });
  }
  function consumeClick(id: string, detail: number) {
    if (suppressClick.current !== id) return false;
    suppressClick.current = null; return detail > 0;
  }
  return { offset, start, move, end, consumeClick };
}

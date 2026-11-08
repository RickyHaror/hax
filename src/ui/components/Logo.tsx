import { useEffect, useRef } from 'preact/hooks';
import { useStore } from '../store';
import { BigButton } from './BigButton';

export function Logo() {
  const store = useStore();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null; held.current = false;
  };
  useEffect(() => cancel, []);
  const start = () => {
    if (held.current || store.screen.value.name === 'parent') return;
    held.current = true;
    timer.current = setTimeout(() => {
      timer.current = null; store.visit({ name: 'parent' });
    }, 3000);
  };
  return <BigButton aria-label="HAX" title="Hold for grown-up settings" class="glow"
    style={{ touchAction: 'none', userSelect: 'none' }}
    onPointerDown={(event) => { if (event.button === 0) start(); }}
    onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
    onLostPointerCapture={cancel} onBlur={cancel}
    onContextMenu={(event) => event.preventDefault()}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); if (!event.repeat) start();
      }
    }} onKeyUp={(event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); cancel(); }
    }}>HAX</BigButton>;
}

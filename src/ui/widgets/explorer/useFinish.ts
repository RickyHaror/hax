import { useRef } from 'preact/hooks';
import { useStore } from '../../store';

export function useFinish(onComplete: () => void) {
  const completed = useRef(false);
  const store = useStore();
  function finish() {
    if (completed.current) return;
    completed.current = true;
    store.sound.play('success');
    onComplete();
  }
  return { completed, finish };
}

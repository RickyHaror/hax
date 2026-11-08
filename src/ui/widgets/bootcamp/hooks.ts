import { useEffect, useRef, useState } from 'preact/hooks';
export function useCompletion(onComplete: () => void) {
  const completed = useRef(false);
  return () => { if (!completed.current) { completed.current = true; onComplete(); } };
}
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}
export function useKeyboard(handle: (event: KeyboardEvent) => void) {
  const latest = useRef(handle);
  latest.current = handle;
  useEffect(() => {
    const listener = (event: KeyboardEvent) => latest.current(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
}

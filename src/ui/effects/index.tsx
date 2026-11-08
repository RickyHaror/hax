import { useEffect, useState } from 'preact/hooks';
import './effects.css';

function Matrix() {
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(() =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const changed = () => setReduced(media?.matches ?? false);
    media?.addEventListener?.('change', changed);
    const timer = window.setTimeout(() => setVisible(false), 3000);
    return () => { window.clearTimeout(timer); media?.removeEventListener?.('change', changed); };
  }, []);
  return visible ? <div class={`playground-matrix${reduced ? ' playground-matrix-still' : ''}`}
    role="img" aria-label="Green code rain">
    {Array.from({ length: 18 }, (_, index) => <span key={index} aria-hidden="true"
      style={{ left: `${index * 5.5}%`, animationDelay: `${-(index % 5) * 0.6}s` }}>
      {'01\n10\n01\n11\n00\n10\n01\n10'}
    </span>)}
  </div> : null;
}

const effects = Object.freeze({ matrix: Matrix });
export function PlaygroundEffect({ effect }: { effect: string | undefined }) {
  const Component = effect && Object.hasOwn(effects, effect) ? effects[effect as keyof typeof effects] : undefined;
  return Component ? <Component /> : null;
}

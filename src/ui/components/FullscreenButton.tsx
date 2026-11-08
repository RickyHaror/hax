import { useEffect, useState } from 'preact/hooks';
import { BigButton } from './BigButton';

export function FullscreenButton() {
  const [active, setActive] = useState(Boolean(document.fullscreenElement));
  useEffect(() => {
    const update = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  if (typeof document.documentElement.requestFullscreen !== 'function') return null;
  const toggle = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { /* Full screen can be refused by the browser. */ }
  };
  return <BigButton class="fullscreen-button" aria-label="Full screen" title="Full screen"
    aria-pressed={active} onClick={toggle}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" />
    </svg>
  </BigButton>;
}

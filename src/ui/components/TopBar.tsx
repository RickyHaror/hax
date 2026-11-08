import { hackerName, useStore } from '../store';
import { BigButton } from './BigButton';
import { FullscreenButton } from './FullscreenButton';

export function TopBar({ title, step, onHelp, helpOpen = false }: {
  title: string; step?: string; onHelp?: () => void; helpOpen?: boolean;
}) {
  const store = useStore();
  const codename = hackerName(store.progress, store.registry);
  return <header class="top-bar">
    <span class="top-brand">&gt;_HAX</span>
    <div class="top-crumb" title={`${title}${step ? `: ${step}` : ''}`}>
      <h1>{title}</h1>{step && <span>{step}</span>}
    </div>
    <span class="agent-pill">{codename}</span>
    {onHelp && <BigButton class="help-button" aria-expanded={helpOpen} aria-controls="step-hints"
      onClick={onHelp}>Help me</BigButton>}
    <FullscreenButton />
  </header>;
}

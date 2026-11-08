import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Step } from '../../engine/types';
import { useStore } from '../store';
import { BigButton } from './BigButton';
import { CommsLine } from './SidekickBubble';
import './sidekick.css';

export function HintLadder({ missionId, step, open, onClose }: {
  missionId: string; step: Step; open?: boolean; onClose?: () => void;
}) {
  const store = useStore();
  const [localOpen, setLocalOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const rung = store.progress.value.hints[missionId]?.[step.id]?.rung ?? 0;
  const client = store.registry.missions.find((mission) => mission.id === missionId)?.client;
  const controlled = open !== undefined;
  const visible = open ?? localOpen;
  useLayoutEffect(() => { if (visible) panel.current?.querySelector('button')?.focus(); }, [visible]);
  const reveal = (next: number) => store.hint(missionId, step.id, next);
  const help = () => { reveal(Math.min(3, rung + 1)); setLocalOpen(true); };
  const close = () => {
    if (onClose) onClose();
    else { setLocalOpen(false); panel.current?.parentElement?.querySelector<HTMLButtonElement>('.help-button')?.focus(); }
  };
  return <section class={`hint-ladder${controlled ? ' rail-hints' : ''}`} aria-label="Hints"
    id={controlled ? 'step-hints' : undefined}>
    {!controlled && <BigButton class="help-button" aria-expanded={visible} onClick={help}>Help me</BigButton>}
    {visible && <div class="hint-panel" ref={panel} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); }
    }}>
      <header><h3>Help me</h3><BigButton aria-label="Close hints" onClick={close}>Close</BigButton></header>
      <p>Hints never cost anything.</p>
      <ol>{['Nudge', 'Bigger hint', 'Show me'].map((label, i) => {
        const next = i + 1;
        const opened = rung >= next;
        const ready = next === rung + 1;
        const state = opened ? 'opened' : ready ? 'ready' : i === 2 ? 'after hint 2' : 'after hint 1';
        return <li key={label} class={opened ? 'rung-opened' : ready ? 'rung-ready' : ''}>
          <BigButton disabled={!opened && !ready} aria-label={`${next} ${label}`}
            onClick={() => reveal(Math.max(rung, next))}>{next} {label}</BigButton>
          <span class="rung-state">{state}</span>
          {opened && <CommsLine line={step.hints[i]!} client={client} />}
        </li>;
      })}</ol>
    </div>}
  </section>;
}

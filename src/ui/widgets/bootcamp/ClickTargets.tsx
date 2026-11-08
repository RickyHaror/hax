import { useRef, useState } from 'preact/hooks';
import type { ClickTargetsConfig } from '../../../engine/types';
import type { WidgetProps } from '../Widget';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { Art } from '../../components/Art';
import { useStore } from '../../store';
import { useCompletion } from './hooks';
import { TrainingPanel } from './TrainingPanel';
export function ClickTargets({ config, showMe, onComplete }: WidgetProps<ClickTargetsConfig>) {
  const store = useStore();
  const finish = useCompletion(onComplete);
  const hits = useRef(new Set<string>());
  const [hit, setHit] = useState<string[]>([]);
  const [pulse, setPulse] = useState('');
  function strike(id: string) {
    if (hits.current.has(id)) return;
    hits.current.add(id); setHit([...hits.current]); store.sound.play('success');
    if (hits.current.size === config.targets.length) finish();
  }
  function click(id: string) {
    if (hits.current.has(id)) return;
    if (config.action === 'click' || showMe) strike(id);
    else { setPulse(id); store.sound.play('tryAgain'); }
  }
  return <TrainingPanel label="Click practice">
    <div class="bc-targets">{config.targets.map((target) => <BigButton key={target.id}
      aria-label={target.label} aria-pressed={hit.includes(target.id)}
      class={!hit.includes(target.id) && (showMe || pulse === target.id) ? 'bc-pulse' : ''}
      onClick={() => click(target.id)} onDblClick={() => strike(target.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); strike(target.id); }
      }}>
      <Art artKey={target.art} title={target.label} />
      <span>{target.label} {hit.includes(target.id) && <span aria-hidden="true">✓</span>}</span>
    </BigButton>)}</div>
    {pulse && <SpeechLine line={{ text: 'Click two times, fast!' }} />}
  </TrainingPanel>;
}

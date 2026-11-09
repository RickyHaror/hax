import { speechCatalog } from '../../speech-catalog';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { DragDropConfig } from '../../../engine/types';
import type { WidgetProps } from '../Widget';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { Art } from '../../components/Art';
import { useStore } from '../../store';
import { useCompletion, useReducedMotion } from './hooks';
import { useDrag } from './drag';
import { TrainingPanel } from './TrainingPanel';
function usePlacements({ config, showMe, onComplete }: WidgetProps<DragDropConfig>) {
  const store = useStore(), finish = useCompletion(onComplete), reduced = useReducedMotion();
  const revealCount = store.revealCount.value;
  const placed = useRef(new Set<string>());
  const [ids, setIds] = useState<string[]>([]), [selected, select] = useState(''), [nudge, setNudge] = useState('');
  function drop(id: string, zone: string | undefined) {
    if (placed.current.has(id)) return;
    const item = config.items.find((item) => item.id === id);
    select('');
    if (!item || item.goesTo !== zone) {
      setNudge(speechCatalog.bootcamp.dragNudge.text); store.sound.play('tryAgain'); return;
    }
    placed.current.add(id); setIds([...placed.current]); setNudge(''); store.sound.play('success');
    if (placed.current.size === config.items.length) finish();
  }
  useEffect(() => {
    if (!showMe) return;
    const remaining = config.items.filter((item) => !placed.current.has(item.id));
    if (reduced) { remaining.forEach((item) => drop(item.id, item.goesTo)); return; }
    const timers = remaining.map((item, index) => window.setTimeout(() => drop(item.id, item.goesTo), 250 * (index + 1)));
    return () => timers.forEach(window.clearTimeout);
  }, [showMe, revealCount, reduced, config]);
  return { ids, selected, select, nudge, drop };
}
export function DragDrop(props: WidgetProps<DragDropConfig>) {
  const { config } = props;
  const { ids, selected, select, nudge, drop } = usePlacements(props);
  const drag = useDrag(drop);
  function itemButton(item: DragDropConfig['items'][number]) {
    const moving = drag.offset.id === item.id;
    return <BigButton key={item.id} aria-label={item.label} aria-pressed={selected === item.id}
      class={`bc-item ${moving ? 'bc-dragging' : ''}`} disabled={ids.includes(item.id)}
      style={{ transform: moving ? `translate(${drag.offset.x}px, ${drag.offset.y}px)` : undefined }}
      onPointerDown={(event) => drag.start(event, item.id)} onPointerMove={drag.move}
      onPointerUp={(event) => drag.end(event)} onPointerCancel={(event) => drag.end(event, true)}
      onLostPointerCapture={(event) => drag.end(event, true)}
      onClick={(event) => { if (!drag.consumeClick(item.id, event.detail)) select(item.id); }}>
      <Art artKey={item.art} title={item.label} size={56} /><span>{item.label}</span>
    </BigButton>;
  }
  return <TrainingPanel label="Sticker practice">
    <div class="bc-items">{config.items.filter((item) => !ids.includes(item.id)).map(itemButton)}</div>
    <div class="bc-zones">{config.zones.map((zone) => <section key={zone.id} role="region" aria-label={zone.label} data-bc-zone={zone.id}>
      <BigButton aria-label={`Put in ${zone.label}`} onClick={() => { if (selected) drop(selected, zone.id); }}>{zone.label}</BigButton>
      <div class="bc-items">{config.items.filter((item) => ids.includes(item.id) && item.goesTo === zone.id).map(itemButton)}</div>
    </section>)}</div>
    {nudge && <SpeechLine line={{ text: nudge }} />}
  </TrainingPanel>;
}

import { useEffect } from 'preact/hooks';
import type { Line } from '../../engine/types';
import { useStore } from '../store';
import { Art } from './Art';
import { SpeechLine } from './SpeechLine';
export function SidekickBubble({ lines, sidekickIndex }: { lines: readonly Line[]; sidekickIndex?: number }) {
  const store = useStore();
  const sidekick = store.registry.sidekicks[sidekickIndex ?? store.progress.value.sidekick ?? 0]
    ?? store.registry.sidekicks[0]!;
  const autoRead = store.progress.value.settings.autoRead;
  const signature = JSON.stringify(lines);
  useEffect(() => {
    if (autoRead) store.voice.speakAll(JSON.parse(signature) as Line[]);
    return () => store.voice.cancel();
  }, [store, signature, autoRead]);
  return <section class="bubble" aria-label={`${sidekick.name} says`}>
    <Art artKey={sidekick.art} title={sidekick.name} />
    <div>{lines.map((line, i) => <SpeechLine key={i} line={line} />)}</div>
  </section>;
}

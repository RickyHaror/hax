import { speechCatalog } from '../../speech-catalog';
import type { ComponentChildren } from 'preact';
import { SpeechLine } from '../../components/SpeechLine';

export function TrainingPanel({ label, children }: { label: string; children: ComponentChildren }) {
  return <section class="bootcamp" aria-label={label}>
    <header class="bc-titlebar"><SpeechLine line={speechCatalog.bootcamp.training} /></header>
    <div class="bc-body">{children}</div>
  </section>;
}

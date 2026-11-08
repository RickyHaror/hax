import { useRef, useState } from 'preact/hooks';
import type { LogReadConfig } from '../../../engine/types';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { useStore } from '../../store';
import type { WidgetProps } from '../Widget';
import { ReadingBox } from '../tools/ReadingBox';

export function LogRead({ config, showMe, onComplete }: WidgetProps<LogReadConfig>) {
  const store = useStore();
  const completed = useRef(false);
  const [wrong, setWrong] = useState(false);
  const label = config.options.find((option) => option.id === config.correct)?.label ?? '';
  const words = label.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((word) => word.length > 3) ?? [];
  function choose(id: string) {
    if (completed.current) return;
    if (id === config.correct) {
      completed.current = true; setWrong(false); store.sound.play('success'); onComplete();
    } else { setWrong(true); store.sound.play('tryAgain'); }
  }
  return <section class="case-widget case-log">
    <h3>{config.fileName}</h3>
    <ReadingBox><div class="case-log-lines" role="region" aria-label={config.fileName} tabIndex={0}>
      {config.lines.map((line, index) => <div key={index}
        class={showMe && words.some((word) => line.toLowerCase().includes(word)) ? 'case-highlight' : undefined}>
        <span class="case-line-number" aria-hidden="true">{index + 1}</span>
        <SpeechLine line={{ text: line }} />
      </div>)}
    </div></ReadingBox>
    <SpeechLine line={config.question} />
    <div class="case-options">{config.options.map((option) => <div key={option.id}>
      <BigButton class={showMe && option.id === config.correct ? 'case-glow' : undefined}
        onClick={() => choose(option.id)}>{option.label}</BigButton>
      {showMe && option.id === config.correct && <SpeechLine line={{ text: 'This one!' }} />}
    </div>)}</div>
    <div aria-live="polite">{wrong && <SpeechLine line={{ text: 'Good try. Read the log for a clue.' }} />}</div>
  </section>;
}

import { useState } from 'preact/hooks';
import type { ChoiceConfig } from '../../../engine/types';
import type { WidgetProps } from '../Widget';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { Art } from '../../components/Art';
import { useStore } from '../../store';
import { useFinish } from './useFinish';

export function Choice({ config, showMe, onComplete }: WidgetProps<ChoiceConfig>) {
  const [feedback, setFeedback] = useState<ChoiceConfig['question']>();
  const store = useStore();
  const { completed, finish } = useFinish(onComplete);
  function choose(option: ChoiceConfig['options'][number]) {
    if (completed.current) return;
    setFeedback(option.feedback);
    if (config.correct.includes(option.id)) finish();
    else store.sound.play('tryAgain');
  }
  return <section class="explorer-widget choice-widget" aria-label="Choose an answer">
    <SpeechLine line={config.question} />
    <div class="choice-options">{config.options.map((option) => {
      const revealed = showMe && config.correct.includes(option.id);
      return <div key={option.id} class={revealed ? 'choice-revealed' : ''}>
        <BigButton aria-label={option.label} onClick={() => choose(option)}>
          {option.art && <Art artKey={option.art} title={option.label} size={56} />}
          {option.label}
        </BigButton>
        {revealed && <div class="choice-hint"><span aria-hidden="true">✓</span>
          <SpeechLine line={{ text: 'This one!' }} /></div>}
      </div>;
    })}</div>
    <div aria-live="polite">{feedback && <SpeechLine line={feedback} />}</div>
  </section>;
}

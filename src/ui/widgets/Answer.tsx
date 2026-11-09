import { speechCatalog } from '../speech-catalog';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { TargetedInputEvent } from 'preact';
import type { AnswerConfig } from '../../engine/types';
import type { WidgetProps } from './index';
import { useStore } from '../store';
import { answersMatch } from '../answers';
import { BigButton } from '../components/BigButton';
import { SpeechLine } from '../components/SpeechLine';
import { PretendSecretInput } from '../components/PretendSecretInput';
export function Answer({ config, showMe, onComplete, password = false }: WidgetProps<AnswerConfig> & { password?: boolean }) {
  const store = useStore();
  const revealCount = store.revealCount.value;
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const completed = useRef(false);
  useEffect(() => { if (showMe) setValue(config.answer); }, [showMe, config.answer, revealCount]);
  function check() {
    if (completed.current) return;
    if (answersMatch(value, config.answer, config.accept)) {
      completed.current = true; store.sound.play('success'); onComplete();
    } else { setWrong(true); store.sound.play('tryAgain'); }
  }
  const field = { value, autoComplete: 'off',
    onInput: (event: TargetedInputEvent<HTMLInputElement>) => setValue(event.currentTarget.value) };
  const content = <>
    <SpeechLine line={config.question} />
    {password ? <PretendSecretInput {...field} onCheck={check} />
      : <label>Answer<input type="text" {...field} /></label>}
    <BigButton type={password ? 'button' : 'submit'} onClick={password ? check : undefined}>Check</BigButton>
    {wrong && <SpeechLine line={speechCatalog.widgets.answerNudge} />}
  </>;
  return password ? <div class="answer-form">{content}</div>
    : <form class="answer-form" onSubmit={(event) => { event.preventDefault(); check(); }}>{content}</form>;
}

import { useEffect, useRef, useState } from 'preact/hooks';
import type { TargetedInputEvent } from 'preact';
import type { AnswerConfig } from '../../engine/types';
import type { WidgetProps } from './index';
import { useStore } from '../store';
import { answersMatch } from '../answers';
import { BigButton } from '../components/BigButton';
import { SpeechLine } from '../components/SpeechLine';
export function Answer({ config, showMe, onComplete, password = false }: WidgetProps<AnswerConfig> & { password?: boolean }) {
  const store = useStore();
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const completed = useRef(false);
  useEffect(() => { if (showMe) setValue(config.answer); }, [showMe, config.answer]);
  function check(event: Event) {
    event.preventDefault();
    if (completed.current) return;
    if (answersMatch(value, config.answer, config.accept)) {
      completed.current = true; store.sound.play('success'); onComplete();
    } else { setWrong(true); store.sound.play('tryAgain'); }
  }
  const field = { value, autoComplete: 'off',
    onInput: (event: TargetedInputEvent<HTMLInputElement>) => setValue(event.currentTarget.value) };
  return <form onSubmit={check}>
    <SpeechLine line={config.question} />
    <label>{password ? 'Password' : 'Answer'}
      {password ? <input type="password" {...field} /> : <input type="text" {...field} />}
    </label>
    <BigButton type="submit">Check</BigButton>
    {wrong && <SpeechLine line={{ text: 'Good try. Look at the clue and try again.' }} />}
  </form>;
}

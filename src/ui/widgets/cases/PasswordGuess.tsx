import type { TargetedInputEvent } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { PasswordGuessConfig } from '../../../engine/types';
import { answersMatch } from '../../answers';
import { Art } from '../../components/Art';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { useStore } from '../../store';
import type { WidgetProps } from '../Widget';

function Profile({ config, showMe }: Pick<WidgetProps<PasswordGuessConfig>, 'config' | 'showMe'>) {
  const clue = Math.max(0, config.profile.facts.findIndex((fact) =>
    fact.text.toLowerCase().includes(config.password.toLowerCase())));
  return <section class="case-profile" aria-label="Profile card">
    <Art artKey={config.profile.art} title={config.profile.name} size={80} />
    <h3>{config.profile.name}</h3>
    {config.profile.facts.map((fact, index) => <div key={index}
      class={showMe && clue === index ? 'case-highlight' : undefined}>
      <SpeechLine line={fact} />
    </div>)}
  </section>;
}

export function PasswordGuess({ config, showMe, onComplete }: WidgetProps<PasswordGuessConfig>) {
  const store = useStore();
  const revealCount = store.revealCount.value;
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [granted, setGranted] = useState(false);
  const completed = useRef(false);
  const notified = useRef(false);
  useEffect(() => { if (showMe) setValue(config.password); }, [showMe, config.password, revealCount]);
  useEffect(() => {
    if (granted && !notified.current) { notified.current = true; onComplete(); }
  }, [granted, onComplete]);
  function check(event: Event) {
    event.preventDefault();
    if (completed.current) return;
    if (answersMatch(value, config.password, config.accept)) {
      completed.current = true;
      setWrong(false); setGranted(true); store.sound.play('success');
    } else { setWrong(true); store.sound.play('tryAgain'); }
  }
  const field = { value, autoComplete: 'off',
    onInput: (event: TargetedInputEvent<HTMLInputElement>) => setValue(event.currentTarget.value) };
  return <div class="case-widget case-password">
    <Profile config={config} showMe={showMe} />
    <form class="case-login" onSubmit={check}>
      <label>Username<input value={config.username} readOnly /></label>
      <label>Password{visible ? <input type="text" {...field} /> : <input type="password" {...field} />}</label>
      <BigButton aria-pressed={visible} onClick={() => setVisible(!visible)}>Show letters</BigButton>
      <BigButton type="submit">Check</BigButton>
      <div aria-live="polite">
        {wrong && <SpeechLine line={{ text: 'Good try. Look at the profile card for a clue.' }} />}
        {granted && <SpeechLine line={{ text: 'Access granted' }} />}
      </div>
    </form>
  </div>;
}

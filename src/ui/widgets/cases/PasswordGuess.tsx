import { speechCatalog } from '../../speech-catalog';
import type { TargetedInputEvent } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { PasswordGuessConfig } from '../../../engine/types';
import { answersMatch } from '../../answers';
import { Art } from '../../components/Art';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { PretendSecretInput } from '../../components/PretendSecretInput';
import { useStore } from '../../store';
import type { WidgetProps } from '../Widget';
import { ReadingBox } from '../tools/ReadingBox';

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
  const [wrong, setWrong] = useState(false);
  const [granted, setGranted] = useState(false);
  const completed = useRef(false);
  const notified = useRef(false);
  useEffect(() => { if (showMe) setValue(config.password); }, [showMe, config.password, revealCount]);
  useEffect(() => {
    if (granted && !notified.current) { notified.current = true; onComplete(); }
  }, [granted, onComplete]);
  function check() {
    if (completed.current) return;
    if (answersMatch(value, config.password, config.accept)) {
      completed.current = true;
      setWrong(false); setGranted(true); store.sound.play('success');
    } else { setWrong(true); store.sound.play('tryAgain'); }
  }
  const field = { value, autoComplete: 'off',
    onInput: (event: TargetedInputEvent<HTMLInputElement>) => setValue(event.currentTarget.value) };
  return <div class="case-widget case-password">
    <ReadingBox><Profile config={config} showMe={showMe} /></ReadingBox>
    <div class="case-login">
      <p>Username: {config.username}</p>
      <PretendSecretInput {...field} onCheck={check} />
      <BigButton type="button" onClick={check}>Check</BigButton>
      <div aria-live="polite">
        {wrong && <SpeechLine line={speechCatalog.widgets.passwordNudge} />}
        {granted && <SpeechLine line={speechCatalog.widgets.accessGranted} />}
      </div>
    </div>
  </div>;
}

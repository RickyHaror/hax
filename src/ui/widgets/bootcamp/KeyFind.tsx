import { useEffect, useRef, useState } from 'preact/hooks';
import type { KeyFindConfig } from '../../../engine/types';
import type { WidgetProps } from '../Widget';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { isEditingOrInDialog } from '../../components/keyboard';
import { useStore } from '../../store';
import { useCompletion, useKeyboard } from './hooks';
import { keyLayout, keyName, keyPrompt, sameKey } from './helpers';
function useKeyQuest({ config, showMe, onComplete }: WidgetProps<KeyFindConfig>) {
  const store = useStore(), finish = useCompletion(onComplete);
  const index = useRef(0), timer = useRef<number | undefined>(undefined);
  const [next, setNext] = useState(0), [flash, setFlash] = useState(''), [nudge, setNudge] = useState('');
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function press(key: string) {
    const target = config.keys[index.current];
    if (target === undefined) return;
    setFlash(key); window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlash(''), 450);
    if (!sameKey(key, target)) {
      setNudge('Good try. Look for the glowing key.'); store.sound.play('tryAgain'); return;
    }
    store.sound.play('key'); setNudge(''); index.current += 1; setNext(index.current);
    if (index.current === config.keys.length) { store.sound.play('success'); finish(); }
  }
  useKeyboard((event) => {
    if (isEditingOrInDialog(event)) return;
    if (event.key === ' ' || event.key === 'Backspace') event.preventDefault();
    if (event.key === 'Tab' || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    const button = event.target instanceof HTMLButtonElement ? event.target : null;
    if (button && (showMe || !button.closest('.bc-keyboard')) && (event.key === 'Enter' || event.key === ' ')) {
      if (event.key === ' ') button.click();
      return;
    }
    press(event.key);
  });
  return { target: config.keys[next], flash, nudge, press };
}
export function KeyFind(props: WidgetProps<KeyFindConfig>) {
  const { target, flash, nudge, press } = useKeyQuest(props);
  return <section class="bootcamp" aria-label="Key practice">
    <SpeechLine line={{ text: target === undefined ? 'You found every key!' : keyPrompt(target) }} />
    <div class={`bc-keyboard ${props.showMe ? 'bc-key-help' : ''}`} aria-label="Practice keyboard">{keyLayout().map((row, index) => <div class="bc-key-row" key={index}>
      {row.map((cap, position) => <BigButton key={position} aria-label={keyName(cap.key)} tabIndex={props.showMe ? 0 : -1}
        class={`${target !== undefined && sameKey(cap.key, target) ? 'bc-key-target' : ''} ${sameKey(cap.key, flash) ? 'bc-key-flash' : ''}`}
        style={{ flexGrow: cap.width }} onClick={() => { if (props.showMe) press(cap.key); }}
        onKeyDown={(event) => {
          if (props.showMe && event.key === ' ') { event.preventDefault(); event.stopPropagation(); press(cap.key); }
        }}>
        {props.showMe && target !== undefined && sameKey(cap.key, target) && <span aria-hidden="true">↓ </span>}{keyName(cap.key)}
      </BigButton>)}
    </div>)}</div>
    {nudge && <SpeechLine line={{ text: nudge }} />}
  </section>;
}

import { useEffect, useRef, useState } from 'preact/hooks';
import type { TypingGameConfig } from '../../../engine/types';
import type { WidgetProps } from '../Widget';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { isEditingOrInDialog } from '../../components/keyboard';
import { useStore } from '../../store';
import { useCompletion, useKeyboard, useReducedMotion } from './hooks';
import { fall, keyName, sameKey, typingSpeed } from './helpers';
import { TrainingPanel } from './TrainingPanel';
function usePackets({ config, showMe, onComplete }: WidgetProps<TypingGameConfig>) {
  const store = useStore(), finish = useCompletion(onComplete), reduced = useReducedMotion();
  const model = useRef({ caught: 0, letters: 0, position: 0, speed: 4 });
  const [state, setState] = useState(model.current), [nudge, setNudge] = useState('');
  const word = config.words[state.caught % config.words.length] ?? '';
  function publish() { setState({ ...model.current }); }
  function catchWord() {
    if (model.current.caught >= config.goal) return;
    model.current = { caught: model.current.caught + 1, letters: 0, position: 0, speed: typingSpeed(model.current.speed, true) };
    setNudge(''); store.sound.play('success'); publish();
    if (model.current.caught >= config.goal) finish();
  }
  useKeyboard((event) => {
    if (isEditingOrInDialog(event)) return;
    if (showMe && event.target instanceof HTMLButtonElement && event.key === ' ') return;
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.key.length !== 1 || model.current.caught >= config.goal) return;
    const currentWord = config.words[model.current.caught % config.words.length] ?? '';
    if (!sameKey(event.key, currentWord[model.current.letters] ?? '')) {
      setNudge('Good try. Find the next bright letter.'); store.sound.play('tryAgain'); return;
    }
    if (event.key === ' ') event.preventDefault();
    store.sound.play('key'); model.current.letters += 1; setNudge('');
    if (model.current.letters === currentWord.length) catchWord(); else publish();
  });
  useEffect(() => {
    if (showMe || reduced || state.caught >= config.goal) return;
    const timer = window.setInterval(() => {
      const next = fall(model.current.position, model.current.speed, 0.05);
      if (next.position === 0) setNudge('Here it comes again. Take your time.');
      model.current = { ...model.current, ...next }; publish();
    }, 50);
    return () => window.clearInterval(timer);
  }, [showMe, reduced, state.caught, config.goal]);
  return { state, word, nudge, catchWord };
}
export function TypingGame(props: WidgetProps<TypingGameConfig>) {
  const { state, word, nudge, catchWord } = usePackets(props);
  const done = state.caught >= props.config.goal;
  return <TrainingPanel label="Packet catcher">
    <div class="bc-score">
    <div aria-live="polite"><SpeechLine line={{ text: `Caught ${state.caught} of ${props.config.goal}` }} /></div>
    {props.showMe && !done && <div class="bc-next-letter"><SpeechLine line={{ text: `Type ${keyName(word[state.letters] ?? '')}` }} /></div>}
    </div>
    <div class="bc-play-area">{!done && <BigButton aria-label={`Catch ${word}`} class="bc-packet"
      style={{ transform: `translate(-50%, ${state.position * 1.4}px)` }}
      onClick={() => { if (props.showMe) catchWord(); }}>
      {[...word].map((letter, index) => <span key={index} class={index < state.letters ? 'bc-typed' : index === state.letters ? 'bc-next' : ''}>{letter}</span>)}
    </BigButton>}</div>
    {nudge && <SpeechLine line={{ text: nudge }} />}
  </TrainingPanel>;
}

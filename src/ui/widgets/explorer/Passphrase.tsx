import { useEffect, useState } from 'preact/hooks';
import type { PassphraseConfig } from '../../../engine/types';
import type { WidgetProps } from '../Widget';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { useStore } from '../../store';
import { useFinish } from './useFinish';

export function Passphrase({ config, showMe, onComplete }: WidgetProps<PassphraseConfig>) {
  const [picked, setPicked] = useState<string[]>([]);
  const [full, setFull] = useState(false);
  const store = useStore();
  const revealCount = store.revealCount.value;
  const { completed, finish } = useFinish(onComplete);
  useEffect(() => {
    if (showMe && !completed.current) {
      setPicked((words) => [...new Set([...words, ...config.words])].slice(0, config.count));
      setFull(false);
    }
  }, [showMe, revealCount, config.words, config.count, completed]);
  function toggle(word: string) {
    if (completed.current) return;
    if (picked.includes(word)) setPicked(picked.filter((item) => item !== word));
    else if (picked.length < config.count) setPicked([...picked, word]);
    else { setFull(true); store.sound.play('tryAgain'); return; }
    setFull(false);
    store.sound.play('click');
  }
  const left = config.count - picked.length;
  const strength = left === 0 ? 'Super strong!' : picked.length ? 'Getting stronger!' : 'Pick your word team.';
  return <section class="explorer-widget passphrase-widget" aria-label="Build a passphrase">
    <div class="word-tiles">{[...new Set(config.words)].map((word) =>
      <BigButton key={word} aria-label={word} aria-pressed={picked.includes(word)}
        onClick={() => toggle(word)}>{word}</BigButton>)}</div>
    <div class="passphrase-preview" aria-live="polite">
      <SpeechLine line={{ text: picked.length ? picked.join('-') : 'Your words go here.' }} />
    </div>
    <meter aria-label="Strength" min={0} max={config.count} value={picked.length}
      aria-valuetext={strength} />
    <SpeechLine line={{ text: strength }} />
    <div aria-live="polite"><SpeechLine line={{ text: left > 0
      ? `Pick ${left} more ${left === 1 ? 'word' : 'words'}.` : 'Your word team is ready.' }} /></div>
    {full && <SpeechLine line={{ text: 'Your team is full. Tap a word to swap it.' }} />}
    <BigButton disabled={left !== 0} onClick={() => { if (left === 0) finish(); }}>Check</BigButton>
  </section>;
}

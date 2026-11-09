import { screenLines, speechCatalog } from '../../speech-catalog';
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
  const strength = left === 0 ? speechCatalog.passphrase.strong.text : picked.length ? speechCatalog.passphrase.stronger.text : speechCatalog.passphrase.pickTeam.text;
  return <section class="explorer-widget passphrase-widget" aria-label="Build a passphrase">
    <div class="word-tiles">{[...new Set(config.words)].map((word) =>
      <BigButton key={word} aria-label={word} aria-pressed={picked.includes(word)}
        onClick={() => toggle(word)}>{word}</BigButton>)}</div>
    <div class="passphrase-preview" aria-live="polite">
      <SpeechLine line={{ text: picked.length ? picked.join('-') : speechCatalog.passphrase.preview.text }} />
    </div>
    <meter aria-label="Strength" min={0} max={config.count} value={picked.length}
      aria-valuetext={strength} />
    <div class="passphrase-status">
    <SpeechLine line={{ text: strength }} />
    <div aria-live="polite"><SpeechLine line={{ text: left > 0
      ? screenLines.wordsLeft(left).text : speechCatalog.passphrase.ready.text }} /></div>
    </div>
    {full && <SpeechLine line={speechCatalog.passphrase.full} />}
    <BigButton disabled={left !== 0} onClick={() => { if (left === 0) finish(); }}>Check</BigButton>
  </section>;
}

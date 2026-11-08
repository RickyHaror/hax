import type { Line } from '../../engine/types';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useStore } from '../store';
import { BigButton } from './BigButton';
import { SpeakerIcon } from './SpeakerIcon';
export function ReadAloudButton({ line, sidekick }: { line: Line; sidekick?: string }) {
  const store = useStore();
  const owner = useRef(Symbol('reading'));
  const [unavailable, setUnavailable] = useState(false);
  const reading = store.reading.value === owner.current;
  useEffect(() => () => {
    if (store.reading.value === owner.current) store.voice.cancel();
  }, [store, line.text, line.say, sidekick]);
  const read = () => {
    setUnavailable(false);
    store.readLine(owner.current, line, sidekick, () => setUnavailable(true));
  };
  return <>
    <BigButton aria-label="Read aloud" aria-pressed={reading}
      class={reading ? 'line-reading' : undefined} onClick={read}>
      <SpeakerIcon />{reading ? 'Reading...' : 'Read aloud'}
    </BigButton>
    {unavailable && <span class="speech-unavailable" role="status">
      This computer cannot talk. Ask a grown-up to turn on sound.
    </span>}
  </>;
}

export function SpeechLine({ line, sidekick }: { line: Line; sidekick?: string }) {
  return <div class="speech-line"><span>{line.text}</span>
    <ReadAloudButton line={line} sidekick={sidekick} />
  </div>;
}

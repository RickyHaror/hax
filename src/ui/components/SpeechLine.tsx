import type { Line } from '../../engine/types';
import { useStore } from '../store';
import { BigButton } from './BigButton';
export function SpeechLine({ line, sidekick }: { line: Line; sidekick?: string }) {
  const { voice } = useStore();
  return <div class="speech-line"><span>{line.text}</span>
    <BigButton aria-label="Read aloud" onClick={() => sidekick === undefined
      ? voice.speak(line) : voice.speak(line, { sidekick })}>Read aloud</BigButton>
  </div>;
}

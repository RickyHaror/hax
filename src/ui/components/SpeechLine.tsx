import type { Line } from '../../engine/types';
import { useStore } from '../store';
import { BigButton } from './BigButton';
export function SpeechLine({ line }: { line: Line }) {
  const { voice } = useStore();
  return <div class="speech-line"><span>{line.text}</span>
    <BigButton aria-label="Read aloud" onClick={() => voice.speak(line)}>Read aloud</BigButton>
  </div>;
}

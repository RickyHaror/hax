import { useEffect, useState } from 'preact/hooks';
import { BigButton } from './BigButton';
import { SpeechLine } from './SpeechLine';
import './clue-toast.css';

export function ClueToast({ xp }: { xp: number }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);
  return <div class="clue-toast-slot">
    {visible && <div class="clue-toast" role="status" aria-label="Clue found">
      <span class="clue-plus" aria-hidden="true">+1</span>
      <SpeechLine line={{ text: `Clue found! +${xp} XP` }} />
      <BigButton aria-label="Dismiss clue" onClick={() => setVisible(false)}>×</BigButton>
    </div>}
  </div>;
}

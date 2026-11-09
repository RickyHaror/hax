import { speechCatalog } from '../../speech-catalog';
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '../../store';
import { SpeechLine } from '../../components/SpeechLine';
import { BigButton } from '../../components/BigButton';

export function SessionNudge() {
  const store = useStore();
  const [, tick] = useState(0);
  const remaining = store.sessionRemaining();
  useEffect(() => {
    if (!Number.isFinite(remaining) || remaining === 0) return;
    const timer = setTimeout(() => tick((value) => value + 1), Math.min(remaining, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [remaining]);
  if (remaining !== 0) return null;
  return <><SpeechLine line={{ text: store.saved.value
    ? speechCatalog.parent.stopSaved.text
    : speechCatalog.parent.stopUnsaved.text }} />
    <BigButton onClick={() => store.visit({ name: 'stop' })}>Stop for today</BigButton></>;
}

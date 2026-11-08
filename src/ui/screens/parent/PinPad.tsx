import { useEffect, useRef, useState } from 'preact/hooks';
import { setPin } from '../../../engine/progress';
import { useStore } from '../../store';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';

function Digits({ value, setValue, disabled }: {
  value: string; setValue: (value: string) => void; disabled: boolean;
}) {
  return <div class="parent-pin-pad">
    <output aria-label="PIN digits" aria-live="polite">{`${value.length} of 4 digits`}</output>
    <div class="parent-digits">{'1234567890'.split('').map((digit) =>
      <BigButton key={digit} disabled={disabled || value.length === 4}
        onClick={() => setValue(value + digit)}>{digit}</BigButton>)}</div>
    <BigButton disabled={disabled || !value.length} onClick={() => setValue(value.slice(0, -1))}>Erase digit</BigButton>
  </div>;
}

export function PinPad({ changing = false, onOpen }: { changing?: boolean; onOpen: () => void }) {
  const store = useStore();
  const setting = changing || !store.progress.value.pin;
  const [value, setValue] = useState('');
  const [first, setFirst] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [time, setTime] = useState(() => (store.now?.() ?? new Date()).getTime());
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const until = store.parentAccess.lockedUntil.value;
  const locked = !setting && time < until;
  useEffect(() => {
    if (!locked) return;
    const timer = setTimeout(() => setTime((store.now?.() ?? new Date()).getTime()), until - time);
    return () => clearTimeout(timer);
  }, [locked, until, time, store]);
  async function submit() {
    if (busy || locked || value.length !== 4) return;
    if (setting && first === null) { setFirst(value); setValue(''); setMessage(''); return; }
    if (setting && first !== value) {
      setFirst(null); setValue(''); setMessage('Those PINs differ. Try both again.'); return;
    }
    setBusy(true);
    try {
      if (setting) {
        const next = await setPin(store.progress.value, value);
        if (active.current) { store.parentPin(next.pin); onOpen(); }
      } else {
        const result = await store.parentAccess.check(value);
        if (!active.current) return;
        setTime((store.now?.() ?? new Date()).getTime());
        if (result === 'ok') onOpen();
        else { setValue(''); setMessage(result === 'wrong' ? 'That PIN did not match. Try again.' : ''); }
      }
    } catch { if (active.current) setMessage('The PIN could not be checked. Try again.'); }
    finally { if (active.current) setBusy(false); }
  }
  const title = setting ? first === null ? 'Set a grown-up PIN' : 'Enter the PIN again' : 'Enter your grown-up PIN';
  return <section aria-label={title} class="parent-pin">
    <h2><SpeechLine line={{ text: title }} /></h2>
    <SpeechLine line={{ text: 'Use four digits.' }} />
    <Digits value={value} setValue={setValue} disabled={busy || locked} />
    <div role="status">{locked ? <SpeechLine line={{ text: 'Please wait 30 seconds. Then try again.' }} />
      : message && <SpeechLine line={{ text: message }} />}</div>
    <BigButton disabled={busy || locked || value.length !== 4} onClick={() => { void submit(); }}>
      {setting ? first === null ? 'Next' : 'Save PIN' : 'Check PIN'}
    </BigButton>
  </section>;
}

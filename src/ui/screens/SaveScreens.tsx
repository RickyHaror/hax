import { useState } from 'preact/hooks';
import { rank, toSaveCode } from '../../engine/progress';
import type { Mission } from '../../engine/types';
import { useStore } from '../store';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { SidekickBubble } from '../components/SidekickBubble';
import { SpeechLine } from '../components/SpeechLine';
import { Toggles } from '../components/Toolbar';
export function SecretKey() {
  const store = useStore();
  return <section aria-label="Secret decryption key">
    <SpeechLine line={{ text: 'Your secret decryption key. Copy it into your notebook.' }} />
    <output class="secret-key">{toSaveCode(store.progress.value, store.registry.missions)}</output>
  </section>;
}
export function Done({ mission }: { mission: Mission }) {
  const store = useStore();
  return <><h1>Great work, Agent! Mission saved.</h1>
    <Art artKey={mission.badge.art} title={mission.badge.name} size={140} />
    <SpeechLine line={{ text: mission.badge.name }} />
    <p>{rank(Object.keys(store.progress.value.completed).length)}</p><SecretKey />
    <BigButton onClick={() => store.go({ name: 'map' })}>Next</BigButton></>;
}
export function Stop() {
  const store = useStore();
  const buddy = store.registry.sidekicks[store.progress.value.sidekick ?? 0] ?? store.registry.sidekicks[0]!;
  return <><h1>See you soon, Agent!</h1><SidekickBubble lines={buddy.goodbye} /><SecretKey />
    <BigButton onClick={store.back}>Back</BigButton></>;
}
const errors = {
  checksum: 'One letter looks different. Check your notebook again.',
  'wrong-length': 'Your key needs twelve letters and numbers. Check your notebook.',
  'bad-character': 'That mark is not in our keys. Check your notebook.',
  'unknown-version': 'This key uses a new code. Ask your grown-up.',
};
export function SaveCode() {
  const store = useStore();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  return <><h1>Enter your secret key</h1><form onSubmit={(event) => {
    event.preventDefault(); const result = store.restore(key);
    if (!result.ok) setError(errors[result.error]);
  }}><label>Secret key<input value={key} onInput={(event) => setKey(event.currentTarget.value)} autoComplete="off" /></label>
    <BigButton type="submit">Check</BigButton>
  </form>{error && <SpeechLine line={{ text: error }} />}<BigButton onClick={store.back}>Back</BigButton></>;
}
export function Settings() {
  const store = useStore();
  const [show, setShow] = useState(false);
  return <><h1>Settings</h1><Toggles />
    <BigButton onClick={() => setShow(!show)} aria-expanded={show}>Show my secret key</BigButton>
    {show && <SecretKey />}<BigButton onClick={store.back}>Back</BigButton></>;
}

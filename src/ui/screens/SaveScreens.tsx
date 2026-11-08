import { useState } from 'preact/hooks';
import { rank, toSaveCode } from '../../engine/progress';
import type { Mission } from '../../engine/types';
import { useStore } from '../store';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { SidekickBubble } from '../components/SidekickBubble';
import { SpeechLine } from '../components/SpeechLine';
import { Toggles } from '../components/Toolbar';
import { SessionNudge } from './parent/SessionNudge';
import { TopBar } from '../components/TopBar';
import { TerminalWindow } from '../terminal/TerminalWindow';
import './startup.css';
export function SecretKey() {
  const store = useStore();
  return <section aria-label="Secret decryption key">
    <SpeechLine line={{ text: 'Your secret decryption key. Copy it into your notebook.' }} />
    <output class="secret-key">{toSaveCode(store.progress.value, store.registry.missions)}</output>
  </section>;
}
export function Done({ mission }: { mission: Mission }) {
  const store = useStore();
  const buddy = store.registry.sidekicks[store.progress.value.sidekick ?? 0] ?? store.registry.sidekicks[0]!;
  return <div class="done"><div class="done-sparkles" aria-hidden="true">
    {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--spark': index }} />)}
    </div><div class="done-summary">
    <div class="done-badge"><Art artKey={mission.badge.art} title={mission.badge.name} size={200} /></div><div>
    <h1>{store.saved.value ? 'Great work, Agent! Mission saved.' : 'Great work, Agent!'}</h1>
    {!store.saved.value && <SpeechLine line={{ text: 'Write your secret key in your notebook. This computer could not save.' }} />}
    <SpeechLine line={{ text: mission.badge.name }} />
    <p>{rank(Object.keys(store.progress.value.completed).length)}</p><SecretKey /></div></div>
    <section class="done-cheer" aria-label={`${buddy.name} says`}>
      <Art artKey={buddy.art} title={buddy.name} size={120} />
      <SpeechLine line={{ text: 'You did it! I am so proud of you.' }} sidekick={buddy.id} />
    </section>
    <div class="parent-session-actions"><BigButton onClick={() => store.go({ name: 'map' })}>Next</BigButton>
      <SessionNudge /></div></div>;
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
  return <div class="startup savecode-screen"><TopBar title="HQ" step="Secret key" />
    <div class="startup-layout"><div class="startup-work">
    <TerminalWindow title="hax-os" status="RESTORE"><div class="savecode-content">
    <h1>Enter your secret key</h1><form onSubmit={(event) => {
    event.preventDefault(); const result = store.restore(key);
    if (!result.ok) setError(errors[result.error]);
  }}><label>Secret key<span class="savecode-prompt" aria-hidden="true">&gt;</span>
    <input value={key} onInput={(event) => setKey(event.currentTarget.value)} autoComplete="off" /></label>
    <BigButton class="startup-primary" type="submit">Check</BigButton>
  </form>{error && <SpeechLine line={{ text: error }} />}</div></TerminalWindow>
    <div class="startup-actions"><BigButton onClick={store.back}>Back</BigButton></div></div>
    <aside class="startup-rail" aria-label="Sidekick rail"><SidekickBubble rail autoRead={false}
      lines={[{ text: 'Your secret key brings back your agent.' }]} /></aside></div></div>;
}
export function Settings() {
  const store = useStore();
  const [show, setShow] = useState(false);
  return <div class="audio-settings"><h1>Settings</h1><Toggles />
    <BigButton onClick={() => setShow(!show)} aria-expanded={show}>Show my secret key</BigButton>
    {show && <SecretKey />}<BigButton onClick={store.back}>Back</BigButton></div>;
}

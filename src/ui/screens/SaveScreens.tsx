import { saveKeySpeech, screenLines, speechCatalog } from '../speech-catalog';
import { useState } from 'preact/hooks';
import { rankFor, toSaveCode, xpEarned, XP_PER_MISSION } from '../../engine/progress';
import type { Mission } from '../../engine/types';
import { useStore } from '../store';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { SidekickBubble } from '../components/SidekickBubble';
import { ReadAloudButton, SpeechLine } from '../components/SpeechLine';
import { Toggles } from '../components/Toolbar';
import { SessionNudge } from './parent/SessionNudge';
import { TopBar } from '../components/TopBar';
import { TerminalWindow } from '../terminal/TerminalWindow';
import { RankBadge } from '../components/RankBadge';
import { ClueToast } from '../components/ClueToast';
import './startup.css';
export function SecretKey() {
  const store = useStore();
  const code = toSaveCode(store.progress.value, store.registry.missions);
  return <section aria-label="Secret decryption key">
    <SpeechLine line={speechCatalog.save.secretKey} />
    <output class="secret-key" style={{ overflowWrap: 'anywhere' }}>{code}</output>
    <ReadAloudButton {...saveKeySpeech(code)} />
  </section>;
}
export function Done({ mission }: { mission: Mission }) {
  const store = useStore();
  const buddy = store.registry.sidekicks[store.progress.value.sidekick ?? 0] ?? store.registry.sidekicks[0]!;
  const xp = xpEarned(store.progress.value, store.registry.missions);
  const gained = mission.xp ?? XP_PER_MISSION;
  const before = rankFor(Math.max(0, xp - gained));
  const after = rankFor(xp);
  return <div class="done"><div class="done-sparkles" aria-hidden="true">
    {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--spark': index }} />)}
    </div>{mission.contract && <ClueToast xp={gained} />}
    <div class="done-scroll" tabIndex={0} aria-label="Mission rewards">
    <h2 class="done-access" aria-label={speechCatalog.save.accessGranted.text}><SpeechLine line={speechCatalog.save.accessGranted} /></h2>
    <div class="done-unlocked"><SpeechLine line={speechCatalog.save.unlocked} /></div>
    <div class="done-summary">
    <div class="done-badge"><Art artKey={mission.badge.art} title={mission.badge.name} size={80} /></div><div>
    <div class="done-saved"><h1>{store.saved.value ? speechCatalog.save.saved.text : speechCatalog.save.greatWork.text}</h1>
      <ReadAloudButton line={{ text: store.saved.value ? speechCatalog.save.saved.text : speechCatalog.save.greatWork.text }} /></div>
    {!store.saved.value && <SpeechLine line={speechCatalog.save.notSaved} />}
    <SpeechLine line={{ text: mission.badge.name }} />
    </div></div>
    {mission.contract && <section class="done-flag" aria-label="Captured clue">
      <SpeechLine line={{ text: mission.contract.flag }} /></section>}
    <div class="done-rewards"><div><SpeechLine line={screenLines.earnedXp(gained)} />
      {before.name !== after.name && <SpeechLine line={screenLines.rankUp(before.name, after.name)} />}
      <RankBadge xp={xp} /></div><SecretKey /></div>
    <section class="done-cheer" aria-label={`${buddy.name} says`}>
      <Art artKey={buddy.art} title={buddy.name} size={48} />
      <SpeechLine line={speechCatalog.save.proud} sidekick={buddy.id} />
    </section></div>
    <div class="parent-session-actions"><BigButton onClick={() => store.go({ name: 'map' })}>Next</BigButton>
      <BigButton onClick={() => store.visit({ name: 'idcard' })}>My agent card</BigButton>
      <SessionNudge /></div></div>;
}
export function Stop() {
  const store = useStore();
  const buddy = store.registry.sidekicks[store.progress.value.sidekick ?? 0] ?? store.registry.sidekicks[0]!;
  return <><h1>See you soon, Agent!</h1><SidekickBubble lines={buddy.goodbye} /><SecretKey />
    <BigButton onClick={store.back}>Back</BigButton></>;
}
const errors = {
  checksum: speechCatalog.save.checksum.text,
  'wrong-length': speechCatalog.save.wrongLength.text,
  'bad-character': speechCatalog.save.badCharacter.text,
  'unknown-version': speechCatalog.save.unknownVersion.text,
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
      lines={[speechCatalog.save.restoreHelp]} /></aside></div></div>;
}
export function Settings() {
  const store = useStore();
  const [show, setShow] = useState(false);
  return <div class="audio-settings"><h1>Settings</h1><Toggles />
    <BigButton onClick={() => setShow(!show)} aria-expanded={show}>Show my secret key</BigButton>
    {show && <SecretKey />}<BigButton onClick={store.back}>Back</BigButton></div>;
}

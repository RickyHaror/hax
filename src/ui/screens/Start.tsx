import { useState } from 'preact/hooks';
import { hasIdentity } from '../../engine/progress';
import { hackerName, useStore } from '../store';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { SidekickBubble } from '../components/SidekickBubble';
import { HintLadder } from '../components/HintLadder';
import { Answer } from '../widgets/Answer';
import { TopBar } from '../components/TopBar';
import { SpeechLine } from '../components/SpeechLine';
import { TerminalWindow } from '../terminal/TerminalWindow';
import { BOOT_LINES } from './boot';
import './startup.css';

function BootLines() {
  return <div class="boot-lines" aria-label="Boot messages">
    {BOOT_LINES.map(({ tag, line }) => <div class="boot-line" key={line.text}>
      <span class={`boot-tag boot-${tag.toLowerCase()}`}>[ {tag} ]</span><SpeechLine line={line} />
    </div>)}
  </div>;
}

export function Start() {
  const store = useStore();
  const [success, setSuccess] = useState(false);
  const [mission] = useState(() => store.registry.missions.find((m) => m.chapter === 'login' && !Object.hasOwn(store.progress.value.completed, m.id)));
  const step = mission?.steps.find((s) => s.config.kind === 'answer');
  const enter = () => store.go({ name: hasIdentity(store.progress.value) ? 'map' : 'onboarding' });
  const returning = hasIdentity(store.progress.value);
  const buddy = store.registry.sidekicks[store.progress.value.sidekick ?? 0] ?? store.registry.sidekicks[0]!;
  const lines = success && step ? step.success : mission && step
    ? [...mission.intro, ...step.lines] : buddy.greeting;
  return <section class="startup login-screen">
    <TopBar title="AGENT HQ" step="Sign in" />
    <div class="startup-layout">
      <div class="startup-work"><TerminalWindow title="hax-os" status="READY">
        <BootLines />
        <section class="hq-signin" aria-label="HQ SIGN IN">
          <header><h2>HQ SIGN IN</h2>{mission && step && !returning && !success &&
            <div class="login-art"><Art artKey={step.art ?? (mission.badge.art || Object.keys(store.registry.art)[0] || '')}
              title={mission.title} size={84} /></div>}</header>
          {returning ? <section class="saved-agent" aria-label="Saved on this computer">
            <h3>Saved on this computer</h3><p>{hackerName(store.progress, store.registry)}</p>
            <BigButton class="startup-primary" onClick={enter}>Start</BigButton>
          </section> : success && step ? <BigButton class="startup-primary" onClick={enter}>Next</BigButton>
            : mission && step && step.config.kind === 'answer' ? <div class="login-task">
              <h3>{step.title}</h3><p>Username: agent</p>
              <Answer step={step} config={step.config} password
                showMe={(store.progress.value.hints[mission.id]?.[step.id]?.rung ?? 0) >= 3}
                onComplete={() => { store.complete(mission.id, true); setSuccess(true); }} />
              <HintLadder missionId={mission.id} step={step} />
            </div> : <BigButton class="startup-primary" onClick={enter}>Start</BigButton>}
        </section>
      </TerminalWindow><div class="startup-actions">
        <BigButton onClick={() => store.visit({ name: 'savecode' })}>I have a secret key</BigButton>
      </div></div>
      <aside class="startup-rail" aria-label="Sidekick rail"><SidekickBubble lines={lines} rail /></aside>
    </div>
  </section>;
}

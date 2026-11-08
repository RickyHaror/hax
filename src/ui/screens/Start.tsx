import { useState } from 'preact/hooks';
import { hasIdentity } from '../../engine/progress';
import { useStore } from '../store';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { SidekickBubble } from '../components/SidekickBubble';
import { HintLadder } from '../components/HintLadder';
import { Answer } from '../widgets/Answer';
export function Start() {
  const store = useStore();
  const [success, setSuccess] = useState(false);
  const [mission] = useState(() => store.registry.missions.find((m) => m.chapter === 'login' && !Object.hasOwn(store.progress.value.completed, m.id)));
  const step = mission?.steps.find((s) => s.config.kind === 'answer');
  const enter = () => store.go({ name: hasIdentity(store.progress.value) ? 'map' : 'onboarding' });
  return <section class="login-screen">
    <h1 class="glow">AGENT HQ</h1>
    {success && step ? <><SidekickBubble lines={step.success} /><BigButton onClick={enter}>Next</BigButton></>
      : mission && step && step.config.kind === 'answer' ? <>
        <h2>{step.title}</h2><div class="login-story">
        <SidekickBubble lines={[...mission.intro, ...step.lines]} />
        <div class="login-art"><Art artKey={step.art ?? (mission.badge.art || Object.keys(store.registry.art)[0] || '')}
          title={mission.title} size={300} /></div></div><div class="login-task">
        <p>Username: agent</p>
        <Answer step={step} config={step.config} password
          showMe={(store.progress.value.hints[mission.id]?.[step.id]?.rung ?? 0) >= 3}
          onComplete={() => { store.complete(mission.id, true); setSuccess(true); }} />
        <HintLadder missionId={mission.id} step={step} /></div>
      </> : <BigButton onClick={enter}>Start</BigButton>}
    <BigButton onClick={() => store.visit({ name: 'savecode' })}>I have a secret key</BigButton>
  </section>;
}

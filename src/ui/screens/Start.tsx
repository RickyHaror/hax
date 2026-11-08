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
  return <>
    <h1 class="glow">AGENT HQ</h1>
    {success && step ? <><SidekickBubble lines={step.success} /><BigButton onClick={enter}>Next</BigButton></>
      : mission && step && step.config.kind === 'answer' ? <>
        <Art artKey={mission.badge.art || Object.keys(store.registry.art)[0] || ''} title={mission.title} size={140} />
        <h2>{step.title}</h2><SidekickBubble lines={[...mission.intro, ...step.lines]} />
        <label>Username<input value="agent" readOnly /></label>
        <Answer step={step} config={step.config} password
          showMe={(store.progress.value.hints[mission.id]?.[step.id]?.rung ?? 0) >= 3}
          onComplete={() => { store.complete(mission.id, true); setSuccess(true); }} />
        <HintLadder missionId={mission.id} step={step} />
      </> : <BigButton onClick={enter}>Start</BigButton>}
    <BigButton onClick={() => store.visit({ name: 'savecode' })}>I have a secret key</BigButton>
  </>;
}

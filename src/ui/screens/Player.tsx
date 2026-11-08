import type { Mission, Step } from '../../engine/types';
import { useStore } from '../store';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { SpeechLine } from '../components/SpeechLine';
import { SidekickBubble } from '../components/SidekickBubble';
import { HintLadder } from '../components/HintLadder';
import { StepWidget } from '../widgets';
export const ethics = { text: 'Only hack what you own or have permission to hack.' };
function Permission({ mission, accept }: { mission: Mission; accept: () => void }) {
  const client = mission.client!;
  return <section><h2>Permission slip</h2><Art artKey={client.art} title={client.company} />
    <SpeechLine line={{ text: client.company }} /><SpeechLine line={{ text: `Signed: ${client.contact}` }} />
    <h3>You may test</h3>{client.allowed.map((line, i) => <SpeechLine key={i} line={line} />)}
    <h3>Leave these alone</h3>{client.notAllowed.map((line, i) => <SpeechLine key={i} line={line} />)}
    <SpeechLine line={ethics} /><BigButton onClick={accept}>I accept</BigButton>
  </section>;
}
function ActiveStep({ mission, step, index }: { mission: Mission; step: Step; index: number }) {
  const store = useStore();
  return <section><h2>{step.title}</h2>
    {step.lockdown && <SpeechLine line={{ text: 'Lock it down!' }} />}
    <SidekickBubble lines={step.lines} />
    <StepWidget step={step} config={step.config}
      showMe={(store.progress.value.hints[mission.id]?.[step.id]?.rung ?? 0) >= 3}
      onComplete={() => store.phase(mission.id, { phase: 'success', index })} />
    <HintLadder missionId={mission.id} step={step} />
  </section>;
}
function PlayerPhase({ mission }: { mission: Mission }) {
  const store = useStore();
  const { phase, index } = store.position.value;
  const move = (next: 'step' | 'outro', nextIndex = 0) =>
    store.phase(mission.id, { phase: next === 'step' && !mission.steps[nextIndex] ? 'outro' : next, index: nextIndex });
  if (phase === 'intro') return <>
    <SidekickBubble lines={mission.client ? [...mission.intro, ethics] : mission.intro} />
    <BigButton onClick={() => mission.client
      ? store.phase(mission.id, { phase: 'permission', index: 0 }) : move('step')}>Start mission</BigButton>
  </>;
  if (phase === 'permission' && mission.client) return <Permission mission={mission} accept={() => move('step')} />;
  if (phase === 'outro') return <><SidekickBubble lines={mission.outro} />
    <BigButton onClick={() => store.complete(mission.id)}>Next</BigButton></>;
  const step = mission.steps[index];
  if (!step) return <BigButton onClick={() => move('outro')}>Next</BigButton>;
  if (phase === 'success') return <><SidekickBubble lines={step.success} />
    <BigButton onClick={() => move('step', index + 1)}>Next</BigButton></>;
  return <ActiveStep key={`${mission.id}:${step.id}`} mission={mission} step={step} index={index} />;
}
export function Player({ mission }: { mission: Mission }) {
  const store = useStore();
  return <><h1>{mission.title}</h1><PlayerPhase mission={mission} />
    {store.position.value.phase !== 'outro' && <BigButton onClick={() => store.go({ name: 'map' })}>Back</BigButton>}
    <BigButton onClick={() => store.visit({ name: 'stop' })}>Stop for today</BigButton>
  </>;
}

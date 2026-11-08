import type { Mission, Step } from '../../engine/types';
import { useStore } from '../store';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { SpeechLine } from '../components/SpeechLine';
import { SidekickBubble } from '../components/SidekickBubble';
import { HintLadder } from '../components/HintLadder';
import { StepWidget } from '../widgets';
export const ethics = { text: 'Only hack what you own or have permission to hack.' };
function withEthics(lines: Step['lines']) {
  return lines.some((line) => line.text === ethics.text) ? lines : [...lines, ethics];
}
function Permission({ mission, accept }: { mission: Mission; accept: () => void }) {
  const client = mission.client!;
  return <section class="player-phase permission"><div class="phase-story permission-columns">
    <div><header class="permission-heading"><Art artKey={client.art} title={client.company} size={120} />
      <h2>Permission slip</h2><div class="permission-signature">
        <SpeechLine line={{ text: client.company }} /><SpeechLine line={{ text: `Signed: ${client.contact}` }} />
      </div></header>
    <h3>You may test</h3>{client.allowed.map((line, i) => <SpeechLine key={i} line={line} />)}</div>
    <div><h3>Leave these alone</h3>{withEthics(client.notAllowed).map((line, i) =>
      <SpeechLine key={i} line={line} />)}</div>
    </div><BigButton onClick={accept}>I accept</BigButton>
  </section>;
}
function ActiveStep({ mission, step, index }: { mission: Mission; step: Step; index: number }) {
  const store = useStore();
  return <section class="active-step"><div class="step-story"><h2>{step.title}</h2>
    {step.lockdown && <SpeechLine line={{ text: 'Lock it down!' }} />}
    <SidekickBubble lines={step.lines} />
    {step.art && <Art artKey={step.art} title={step.title} size={240} />}
    </div><div class="step-work">
    <StepWidget step={step} config={step.config}
      showMe={(store.progress.value.hints[mission.id]?.[step.id]?.rung ?? 0) >= 3}
      onComplete={() => store.phase(mission.id, { phase: 'success', index })} />
    <HintLadder missionId={mission.id} step={step} /></div>
  </section>;
}
function MessagePhase({ lines, label, next }: { lines: Step['lines']; label: string; next: () => void }) {
  return <section class="player-phase"><div class="phase-story"><SidekickBubble lines={lines} /></div>
    <BigButton onClick={next}>{label}</BigButton></section>;
}
function PlayerPhase({ mission }: { mission: Mission }) {
  const store = useStore();
  const { phase, index } = store.position.value;
  const move = (next: 'step' | 'outro', nextIndex = 0) =>
    store.phase(mission.id, { phase: next === 'step' && !mission.steps[nextIndex] ? 'outro' : next, index: nextIndex });
  if (phase === 'intro') return <MessagePhase lines={mission.client ? withEthics(mission.intro) : mission.intro}
    label="Start mission" next={() => mission.client
      ? store.phase(mission.id, { phase: 'permission', index: 0 }) : move('step')} />;
  if (phase === 'permission' && mission.client) return <Permission mission={mission} accept={() => move('step')} />;
  if (phase === 'outro') return <MessagePhase lines={mission.outro} label="Next" next={() => store.complete(mission.id)} />;
  const step = mission.steps[index];
  if (!step) return <BigButton onClick={() => move('outro')}>Next</BigButton>;
  if (phase === 'success') return <MessagePhase lines={step.success} label="Next" next={() => move('step', index + 1)} />;
  return <ActiveStep key={`${mission.id}:${step.id}`} mission={mission} step={step} index={index} />;
}
export function Player({ mission }: { mission: Mission }) {
  const store = useStore();
  return <div class="player"><h1>{mission.title}</h1><PlayerPhase mission={mission} />
    <div class="player-navigation">
    {store.position.value.phase !== 'outro' && <BigButton onClick={() => store.go({ name: 'map' })}>Back</BigButton>}
    <BigButton onClick={() => store.visit({ name: 'stop' })}>Stop for today</BigButton>
    </div></div>;
}

import { useState } from 'preact/hooks';
import type { Mission, Step } from '../../engine/types';
import { useStore } from '../store';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { SpeechLine } from '../components/SpeechLine';
import { SidekickBubble } from '../components/SidekickBubble';
import { HintLadder } from '../components/HintLadder';
import { StepWidget } from '../widgets';
import { TopBar } from '../components/TopBar';
import { Toolbar } from '../components/Toolbar';
import './player.css';
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
function ActiveStep({ mission, step, index, helpOpen, closeHelp }: {
  mission: Mission; step: Step; index: number; helpOpen: boolean; closeHelp: () => void;
}) {
  const store = useStore();
  const lines = step.lockdown ? [{ text: 'Lock it down!' }, ...step.lines] : step.lines;
  return <section class="active-step"><div class="step-work">
    <h2>{step.title}</h2>
    {step.art && <Art artKey={step.art} title={step.title} size={240} />}
    <StepWidget step={step} config={step.config}
      showMe={(store.progress.value.hints[mission.id]?.[step.id]?.rung ?? 0) >= 3}
      onComplete={() => store.phase(mission.id, { phase: 'success', index })} /></div>
    <aside class="step-story" aria-label="Sidekick rail">
      <SidekickBubble lines={lines} client={mission.client} rail />
      <HintLadder missionId={mission.id} step={step} open={helpOpen} onClose={closeHelp} />
    </aside>
  </section>;
}
function MessagePhase({ lines, label, next, mission }: {
  lines: Step['lines']; label: string; next: () => void; mission: Mission;
}) {
  return <section class="player-phase"><div class="phase-story"><SidekickBubble lines={lines} client={mission.client} bySpeaker /></div>
    <BigButton onClick={next}>{label}</BigButton></section>;
}
function PlayerPhase({ mission, helpOpen, closeHelp }: { mission: Mission; helpOpen: boolean; closeHelp: () => void }) {
  const store = useStore();
  const { phase, index } = store.position.value;
  const move = (next: 'step' | 'outro', nextIndex = 0) =>
    store.phase(mission.id, { phase: next === 'step' && !mission.steps[nextIndex] ? 'outro' : next, index: nextIndex });
  if (phase === 'intro') return <MessagePhase mission={mission} lines={mission.client ? withEthics(mission.intro) : mission.intro}
    label="Start mission" next={() => mission.client
      ? store.phase(mission.id, { phase: 'permission', index: 0 }) : move('step')} />;
  if (phase === 'permission' && mission.client) return <Permission mission={mission} accept={() => move('step')} />;
  if (phase === 'outro') return <MessagePhase mission={mission} lines={mission.outro} label="Next" next={() => store.complete(mission.id)} />;
  const step = mission.steps[index];
  if (!step) return <BigButton onClick={() => move('outro')}>Next</BigButton>;
  if (phase === 'success') return <MessagePhase mission={mission} lines={step.success} label="Next" next={() => move('step', index + 1)} />;
  return <ActiveStep key={`${mission.id}:${step.id}`} mission={mission} step={step} index={index}
    helpOpen={helpOpen} closeHelp={closeHelp} />;
}
export function Player({ mission }: { mission: Mission }) {
  const store = useStore();
  const { phase, index } = store.position.value;
  const step = phase === 'step' ? mission.steps[index] : undefined;
  const [helpStep, setHelpStep] = useState<string | null>(null);
  const helpOpen = Boolean(step && helpStep === step.id);
  const closeHelp = () => {
    setHelpStep(null);
    document.querySelector<HTMLButtonElement>('.top-bar .help-button')?.focus();
  };
  const help = step ? () => {
    const rung = store.progress.value.hints[mission.id]?.[step.id]?.rung ?? 0;
    store.hint(mission.id, step.id, Math.min(3, rung + 1));
    setHelpStep(step.id);
  } : undefined;
  return <div class="player"><TopBar title={mission.title}
    step={step ? `Step ${index + 1} of ${mission.steps.length}` : undefined} onHelp={help} helpOpen={helpOpen} />
    <PlayerPhase mission={mission} helpOpen={helpOpen} closeHelp={closeHelp} />
    <div class="player-navigation">
    {store.position.value.phase !== 'outro' && <BigButton onClick={() => store.go({ name: 'map' })}>Back</BigButton>}
    <BigButton onClick={() => store.visit({ name: 'stop' })}>Stop for today</BigButton>
    <Toolbar compact />
    </div></div>;
}

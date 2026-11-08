import type { Step } from '../../engine/types';
import { useStore } from '../store';
import { BigButton } from './BigButton';
import { SpeechLine } from './SpeechLine';
import { SpeakerLines } from './SidekickBubble';
export function HintLadder({ missionId, step }: { missionId: string; step: Step }) {
  const store = useStore();
  const rung = store.progress.value.hints[missionId]?.[step.id]?.rung ?? 0;
  const mission = store.screen.value.name === 'player'
    ? store.registry.missions.find((entry) => entry.id === missionId) : undefined;
  return <section aria-label="Hints">
    <BigButton onClick={() => store.hint(missionId, step.id, Math.min(3, rung + 1))}>Help me</BigButton>
    {rung > 0 && (mission
      ? <SpeakerLines lines={[step.hints[rung - 1]!]} client={mission.client} compact />
      : <SpeechLine line={step.hints[rung - 1]!} />)}
  </section>;
}

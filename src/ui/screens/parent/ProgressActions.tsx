import { useState } from 'preact/hooks';
import { useStore } from '../../store';
import { BigButton } from '../../components/BigButton';

export function ProgressActions() {
  const store = useStore();
  const [unlock, setUnlock] = useState<string | null>(null);
  const [reset, setReset] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);
  return <>
    <section aria-label="Unlock a mission"><h2>Unlock a mission</h2>
      <p>Mark a mission done so the next one opens.</p>
      {unlock === null ? <div class="parent-options">{store.registry.missions.map((mission) =>
        <BigButton key={mission.id} disabled={Object.hasOwn(store.progress.value.completed, mission.id)}
          onClick={() => setUnlock(mission.id)}>Mark {mission.title} done</BigButton>)}</div>
        : <div role="group" aria-label="Confirm unlock"><p>Mark {store.registry.missions.find((m) => m.id === unlock)?.title} done?</p>
          <BigButton onClick={() => { store.parentUnlock(unlock); setUnlock(null); }}>Yes, mark done</BigButton>
          <BigButton onClick={() => setUnlock(null)}>Cancel</BigButton></div>}
    </section>
    <section aria-label="Reset progress"><h2>Reset all progress</h2>
      <p>This clears the agent, missions, hints, settings and playground eggs. The PIN stays.</p>
      {reset ? <div role="group" aria-label="Confirm reset">
        <BigButton onClick={() => setResetFailed(!store.parentReset())}>Yes, reset everything</BigButton>
        <BigButton onClick={() => setReset(false)}>Cancel</BigButton>
      </div> : <BigButton onClick={() => setReset(true)}>Reset all progress</BigButton>}
      {resetFailed && <p role="alert">Reset did not save. Try again, or clear site data in the browser.</p>}
    </section>
  </>;
}

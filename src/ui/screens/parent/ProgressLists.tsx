import { useStore } from '../../store';

function CompletionDate({ value }: { value: string }) {
  const iso = /^(\d{4}|[+-]\d{6})-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (typeof value !== 'string' || !iso.test(value)) return <>Done</>;
  const date = new Date(value);
  const day = value.slice(0, value.indexOf('T'));
  const midnight = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(midnight.getTime())
    || !midnight.toISOString().startsWith(day)) return <>Done</>;
  return <time dateTime={value}>{date.toLocaleDateString()}</time>;
}

export function ProgressLists() {
  const store = useStore();
  const progress = store.progress.value;
  const title = (id: string) => store.registry.missions.find((mission) => mission.id === id)?.title ?? id;
  return <>
    <section aria-label="Completed missions"><h2>Completed missions</h2>
      {!Object.keys(progress.completed).length && <p>No completed missions yet.</p>}
      <ul>{Object.entries(progress.completed).map(([id, date]) =>
        <li key={id}>{title(id)}: <CompletionDate value={date} /></li>)}</ul>
    </section>
    <section aria-label="Hint usage"><h2>Hint usage</h2>
      {!Object.keys(progress.hints).length && <p>No hints used yet.</p>}
      {Object.entries(progress.hints).map(([id, steps]) => <div key={id}><h3>{title(id)}</h3>
        <ul>{Object.entries(steps).map(([stepId, hint]) => <li key={stepId}>
          {store.registry.missions.find((mission) => mission.id === id)?.steps.find((step) => step.id === stepId)?.title ?? stepId}
          {`: highest rung ${hint.rung}, count ${hint.count}`}
        </li>)}</ul></div>)}
    </section>
  </>;
}

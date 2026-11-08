import { isUnlocked, rank } from '../../engine/progress';
import type { Mission } from '../../engine/types';
import { hackerName, useStore } from '../store';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { ReadAloudButton, SpeechLine } from '../components/SpeechLine';
function MissionCard({ mission }: { mission: Mission }) {
  const store = useStore();
  const progress = store.progress.value;
  const unlocked = isUnlocked(progress, mission);
  const missing = mission.requires.find((id) => !Object.hasOwn(progress.completed, id));
  const title = store.registry.missions.find((m) => m.id === missing)?.title ?? 'the first mission';
  return <section class="card">
    <BigButton disabled={!unlocked} onClick={() => store.openMission(mission.id)}>
      <span>{Object.hasOwn(progress.completed, mission.id) ? '✓ ' : !unlocked ? '🔒 ' : ''}{mission.title}</span>
      <span>{mission.blurb}</span><span>{mission.minutes} minutes</span>
    </BigButton>
    <ReadAloudButton line={{ text: mission.blurb }} />
    {!unlocked && <SpeechLine line={{ text: `Finish ${title} first` }} />}
  </section>;
}
export function Map() {
  const store = useStore();
  const progress = store.progress.value;
  const buddy = store.registry.sidekicks[progress.sidekick ?? 0] ?? store.registry.sidekicks[0]!;
  const chapters = [['login', 'Login'], ['bootcamp', 'Boot Camp'], ['terminal', 'Terminal Training'], ['missions', 'Missions']] as const;
  return <>
    <h1>{hackerName(store.progress, store.registry)}</h1>
    <Art artKey={buddy.art} title={buddy.name} /><p>{buddy.name} · {rank(Object.keys(progress.completed).length)}</p>
    {store.notice.value && <SpeechLine line={{ text: store.notice.value }} />}
    {!store.registry.missions.length && <SpeechLine line={{ text: 'Missions coming soon' }} />}
    {chapters.map(([chapter, title]) => {
      const missions = store.registry.missions.filter((mission) => mission.chapter === chapter);
      return missions.length ? <section key={chapter} aria-label={title}>
        <h2>{title}</h2><div class="choices">{missions
          .map((mission) => <MissionCard key={mission.id} mission={mission} />)}</div>
      </section> : null;
    })}
    <BigButton onClick={() => store.visit({ name: 'settings' })}>Settings</BigButton>
    <BigButton onClick={() => store.visit({ name: 'stop' })}>Stop for today</BigButton>
  </>;
}

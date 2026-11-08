import { useEffect, useRef } from 'preact/hooks';
import { isUnlocked, rank } from '../../engine/progress';
import type { Mission } from '../../engine/types';
import { hackerName, useStore } from '../store';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { ReadAloudButton, SpeechLine } from '../components/SpeechLine';
import './map.css';
function MissionCard({ mission, next }: { mission: Mission; next: boolean }) {
  const store = useStore();
  const card = useRef<HTMLElement>(null);
  const progress = store.progress.value;
  const unlocked = isUnlocked(progress, mission);
  const done = Object.hasOwn(progress.completed, mission.id);
  const missing = mission.requires.find((id) => !Object.hasOwn(progress.completed, id));
  const title = store.registry.missions.find((m) => m.id === missing)?.title ?? 'the first mission';
  const lockedText = unlocked ? '' : `Finish ${title} first`;
  const duration = `${mission.minutes} ${mission.minutes === 1 ? 'minute' : 'minutes'}`;
  useEffect(() => {
    if (!next) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    card.current?.scrollIntoView?.({
      block: 'nearest', behavior: reduced ? 'instant' : 'smooth',
    });
  }, [next]);
  const state = done ? ' map-card-done' : !unlocked ? ' map-card-locked' : '';
  return <section ref={card} class={`map-card${state}${next ? ' map-card-next' : ''}`}>
    <BigButton class="map-mission" disabled={!unlocked} onClick={() => store.openMission(mission.id)}>
      <span class="map-title"><span class="map-stamp">{done ? '✓ ' : !unlocked ? '🔒 ' : ''}</span>{mission.title}</span>
      <span class="map-art" aria-hidden="true">
        <Art artKey={mission.client?.art ?? mission.badge.art} title="" size={88} />
      </span>
      <span class="map-blurb">{mission.blurb}</span><span class="map-duration">{duration}</span>
    </BigButton>
    {next && <p class="map-next">Next mission</p>}
    {lockedText && <p class="map-locked">{lockedText}</p>}
    <ReadAloudButton line={{ text: [mission.title, mission.blurb, duration, lockedText,
      next ? 'Next mission' : ''].filter(Boolean).join('. ') }} />
  </section>;
}
export function Map() {
  const store = useStore();
  const progress = store.progress.value;
  const buddy = store.registry.sidekicks[progress.sidekick ?? 0] ?? store.registry.sidekicks[0]!;
  const next = store.registry.missions.find((mission) =>
    isUnlocked(progress, mission) && !Object.hasOwn(progress.completed, mission.id));
  const chapters = [['login', 'Login'], ['bootcamp', 'Boot Camp'], ['terminal', 'Terminal Training'], ['missions', 'Missions']] as const;
  return <div class="mission-map">
    <header class="map-header">
      <Art artKey={buddy.art} title={buddy.name} size={56} />
      <div><h1>{hackerName(store.progress, store.registry)}</h1>
        <p>{buddy.name} · {rank(Object.keys(progress.completed).length)}</p></div>
    </header>
    {store.notice.value && <SpeechLine line={{ text: store.notice.value }} />}
    {!store.registry.missions.length && <SpeechLine line={{ text: 'Missions coming soon' }} />}
    {store.registry.playground && Object.hasOwn(progress.completed, store.registry.playground.unlockedBy)
      && <section class="map-playground" aria-label="Playground door">
        <BigButton aria-label="Agent Playground" onClick={() => store.go({ name: 'playground' })}>
          <Art artKey="playground-door" title="Agent Playground door" size={88} />
          <span>Agent Playground</span>
        </BigButton>
        <SpeechLine line={{ text: 'Explore your pretend computer. Find fun secrets!' }} />
      </section>}
    <div class="map-chapters">{chapters.map(([chapter, title]) => {
      const missions = store.registry.missions.filter((mission) => mission.chapter === chapter);
      return missions.length ? <section key={chapter} aria-label={title}>
        <h2>{title}</h2><div class="map-grid">{missions
          .map((mission) => <MissionCard key={mission.id} mission={mission} next={mission.id === next?.id} />)}</div>
      </section> : null;
    })}</div>
    <footer class="map-actions">
      <BigButton onClick={() => store.visit({ name: 'idcard' })}>My agent card</BigButton>
      <BigButton onClick={() => store.visit({ name: 'settings' })}>Settings</BigButton>
      <BigButton onClick={() => store.visit({ name: 'stop' })}>Stop for today</BigButton>
    </footer>
  </div>;
}

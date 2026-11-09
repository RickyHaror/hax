import { screenLines, speechCatalog } from '../speech-catalog';
import { useEffect, useRef } from 'preact/hooks';
import { isUnlocked, rankFor, xpEarned } from '../../engine/progress';
import type { Mission, Season } from '../../engine/types';
import { hackerName, useStore } from '../store';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { ReadAloudButton, SpeechLine } from '../components/SpeechLine';
import './map.css';
function MissionCard({ mission, next, seasonLock = '' }: { mission: Mission; next: boolean; seasonLock?: string }) {
  const store = useStore();
  const card = useRef<HTMLElement>(null);
  const progress = store.progress.value;
  const unlocked = !seasonLock && isUnlocked(progress, mission);
  const done = Object.hasOwn(progress.completed, mission.id);
  const missing = mission.requires.find((id) => !Object.hasOwn(progress.completed, id));
  const title = store.registry.missions.find((m) => m.id === missing)?.title ?? speechCatalog.map.firstMission.text;
  const lockedText = seasonLock || (unlocked ? '' : screenLines.finishMission(title).text);
  const duration = screenLines.duration(mission.minutes).text;
  useEffect(() => {
    if (!next) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    card.current?.scrollIntoView?.({
      block: 'nearest', behavior: reduced ? 'instant' : 'smooth',
    });
  }, [next]);
  const state = done ? ' map-card-done' : !unlocked ? ' map-card-locked' : '';
  return <section ref={card} aria-current={next ? 'step' : undefined} class={`map-card${state}${next ? ' map-card-next' : ''}`}>
    <BigButton class="map-mission" disabled={!unlocked} onClick={() => store.openMission(mission.id)}>
      <span class="map-title"><span class="map-stamp">{done ? '✓ ' : !unlocked ? '🔒 ' : ''}</span>{mission.title}</span>
      <span class="map-art" aria-hidden="true">
        <Art artKey={mission.client?.art ?? mission.badge.art} title="" size={88} />
      </span>
      <span class="map-blurb">{mission.blurb}</span><span class="map-duration">{duration}</span>
    </BigButton>
    {next && <p class="map-next">Next mission</p>}
    {lockedText && <p class="map-locked">{lockedText}</p>}
    <ReadAloudButton line={screenLines.missionCard(mission.title, mission.blurb, duration, lockedText, next)} />
  </section>;
}
function seasonMissions(season: Season, missions: readonly Mission[]) {
  return season.missions.flatMap((id) => {
    const mission = missions.find((entry) => entry.id === id && entry.chapter === 'season' && !entry.retired);
    return mission ? [mission] : [];
  });
}
function seasonLock(season: Season, seasons: readonly Season[], missions: readonly Mission[], completed: Record<string, string>) {
  if (season.requires === null) return '';
  const required = seasons.find((entry) => entry.id === season.requires);
  if (required && seasonMissions(required, missions).every((entry) => Object.hasOwn(completed, entry.id))) return '';
  return required ? screenLines.finishSeason(required.number).text : speechCatalog.map.priorSeason.text;
}
function SeasonSection({ season, next }: { season: Season; next?: string }) {
  const store = useStore();
  const missions = seasonMissions(season, store.registry.missions);
  const completed = store.progress.value.completed;
  const locked = seasonLock(season, store.registry.seasons, store.registry.missions, completed);
  const title = screenLines.season(season.number, season.title).text;
  return <section class="map-season" aria-label={title}>
    <div class="map-season-heading"><h2>{title}</h2><ReadAloudButton line={{ text: title }} /></div>
    <SpeechLine line={{ text: season.blurb }} />
    <SpeechLine line={screenLines.missions(missions.filter((m) => Object.hasOwn(completed, m.id)).length, missions.length)} />
    {locked && <SpeechLine line={{ text: locked }} />}
    <div class="map-grid">{missions.map((mission) => <MissionCard key={mission.id} mission={mission}
      next={mission.id === next} seasonLock={locked} />)}</div>
  </section>;
}
export function Map() {
  const store = useStore();
  const progress = store.progress.value;
  const buddy = store.registry.sidekicks[progress.sidekick ?? 0] ?? store.registry.sidekicks[0]!;
  const missions = store.registry.missions.filter((mission) => !mission.retired);
  const ordered = [...missions.filter((mission) => mission.chapter !== 'season'),
    ...store.registry.seasons.flatMap((season) => seasonLock(season, store.registry.seasons, missions, progress.completed)
      ? [] : seasonMissions(season, missions))];
  const current = ordered.find((mission) => mission.id === progress.current?.missionId && isUnlocked(progress, mission));
  const next = current ?? ordered.find((mission) =>
    isUnlocked(progress, mission) && !Object.hasOwn(progress.completed, mission.id));
  const chapters = [['login', 'Login'], ['bootcamp', 'Boot Camp'], ['terminal', 'Terminal Training'], ['missions', 'Missions']] as const;
  return <div class="mission-map">
    <header class="map-header">
      <Art artKey={buddy.art} title={buddy.name} size={56} />
      <div><h1>{hackerName(store.progress, store.registry)}</h1>
        <p>{buddy.name} · {rankFor(xpEarned(progress, store.registry.missions)).name}</p></div>
    </header>
    {store.notice.value && <SpeechLine line={{ text: store.notice.value }} />}
    {!ordered.length && !store.registry.seasons.length && <SpeechLine line={speechCatalog.map.comingSoon} />}
    {store.registry.playground && Object.hasOwn(progress.completed, store.registry.playground.unlockedBy)
      && <section class="map-playground" aria-label="Playground door">
        <BigButton aria-label="Agent Playground" onClick={() => store.go({ name: 'playground' })}>
          <Art artKey="playground-door" title="Agent Playground door" size={88} />
          <span>Agent Playground</span>
        </BigButton>
        <SpeechLine line={speechCatalog.map.explore} />
      </section>}
    <div class="map-chapters">{chapters.map(([chapter, title]) => {
      const entries = missions.filter((mission) => mission.chapter === chapter);
      return entries.length ? <section key={chapter} aria-label={title}>
        <h2>{title}</h2><div class="map-grid">{entries
          .map((mission) => <MissionCard key={mission.id} mission={mission} next={mission.id === next?.id} />)}</div>
      </section> : null;
    })}{store.registry.seasons.map((season) => <SeasonSection key={season.id} season={season} next={next?.id} />)}</div>
    <footer class="map-actions">
      <BigButton onClick={() => store.visit({ name: 'idcard' })}>My agent card</BigButton>
      <BigButton onClick={() => store.visit({ name: 'settings' })}>Settings</BigButton>
      <BigButton onClick={() => store.visit({ name: 'stop' })}>Stop for today</BigButton>
    </footer>
  </div>;
}

import { effect } from '@preact/signals';
import type { MusicPlayer, MusicTrack } from '../engine/music';
import type { Voice } from '../engine/voice';
import type { AppStore } from './store';
import type { Mission } from '../engine/types';
import type { Registry } from './registry';

function isFinale(mission: Mission | undefined, registry: Registry): boolean {
  if (!mission || mission.retired) return false;
  if (registry.seasons.length) {
    return registry.seasons.some((season) => season.missions.at(-1) === mission.id);
  }
  // Without seasons, the last live mission in game order is the finale.
  return registry.missions.filter((item) => !item.retired).at(-1)?.id === mission.id;
}

export function musicTrack(store: Pick<AppStore, 'screen' | 'position' | 'registry'>): MusicTrack | null {
  const screen: { name: string; missionId?: string } = store.screen.value;
  if (screen.name === 'playground') return 'playground';
  if (screen.name !== 'player') return 'hq';
  const mission = store.registry.missions.find((item) => item.id === screen.missionId);
  const position = store.position.value;
  const kind = position.phase === 'step' ? mission?.steps[position.index]?.config.kind : null;
  if (kind === 'typing-game' || kind === 'key-find') return null;
  if (isFinale(mission, store.registry)) return 'graduation';
  if (mission?.chapter === 'bootcamp') return 'bootcamp';
  if (mission?.chapter === 'terminal' || mission?.client) return 'terminal';
  return 'hq';
}

export function startMusicFollow(
  store: AppStore, music: MusicPlayer, voice: Voice,
) {
  let begun = false;
  let disposed = false;
  let track: MusicTrack | null = null;
  const stopEffect = effect(() => {
    track = musicTrack(store);
    if (begun) music.play(track);
  });
  const unsubscribe = voice.onSpeakingChange?.((speaking) => music.duck(speaking));
  music.duck(voice.isSpeaking());
  return {
    begin() {
      if (begun || disposed) return;
      begun = true; music.play(track);
    },
    stop() {
      disposed = true;
      stopEffect(); unsubscribe?.(); music.play(null);
    },
  };
}

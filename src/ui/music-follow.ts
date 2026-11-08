import { effect } from '@preact/signals';
import type { MusicPlayer, MusicTrack } from '../engine/music';
import type { Voice } from '../engine/voice';
import type { AppStore } from './store';

export function musicTrack(store: Pick<AppStore, 'screen' | 'position' | 'registry'>): MusicTrack | null {
  const screen: { name: string; missionId?: string } = store.screen.value;
  if (screen.name === 'playground') return 'playground';
  if (screen.name !== 'player') return 'hq';
  const mission = store.registry.missions.find((item) => item.id === screen.missionId);
  const position = store.position.value;
  const kind = position.phase === 'step' ? mission?.steps[position.index]?.config.kind : null;
  if (kind === 'typing-game' || kind === 'key-find') return null;
  if (mission?.id === 'm7-graduation') return 'graduation';
  if (mission?.chapter === 'bootcamp') return 'bootcamp';
  if (mission?.chapter === 'terminal' || mission?.client) return 'terminal';
  return 'hq';
}

export function startMusicFollow(
  store: AppStore, music: MusicPlayer, voice: Voice, gestures: EventTarget = document,
): () => void {
  let begun = false;
  let track: MusicTrack | null = null;
  const stop = effect(() => {
    track = musicTrack(store);
    if (begun) music.play(track);
  });
  const gesture = () => { begun = true; music.play(track); };
  const unsubscribe = voice.onSpeakingChange?.((speaking) => music.duck(speaking));
  music.duck(voice.isSpeaking());
  gestures.addEventListener('pointerdown', gesture);
  gestures.addEventListener('keydown', gesture);
  gestures.addEventListener('click', gesture);
  return () => {
    stop(); unsubscribe?.();
    gestures.removeEventListener('pointerdown', gesture);
    gestures.removeEventListener('keydown', gesture);
    gestures.removeEventListener('click', gesture);
    music.play(null);
  };
}

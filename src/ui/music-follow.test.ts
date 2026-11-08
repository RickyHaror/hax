import { describe, expect, it, vi } from 'vitest';
import { createVoice } from '../engine/voice';
import type { MusicPlayer, MusicTrack } from '../engine/music';
import type { Mission, StepConfig } from '../engine/types';
import { createStore, type Screen } from './store';
import { musicTrack, startMusicFollow } from './music-follow';
import { client, fixtureRegistry, login } from './test/fixtures';
import { fakeDeps } from './test/helpers';

const tracks: Mission[] = [login, client,
  { ...client, id: 'terminal', client: undefined, chapter: 'terminal' },
  { ...client, id: 'bootcamp', client: undefined, chapter: 'bootcamp' },
  { ...client, id: 'm7-graduation' },
];
function setup() {
  const missions = tracks.map((mission) => ({ ...mission,
    steps: mission.steps.map((step) => ({ ...step, config: { ...step.config } })) }));
  const store = createStore({ ...fakeDeps(), registry: fixtureRegistry(missions) });
  const music: MusicPlayer = { supported: true, play: vi.fn(), duck: vi.fn(),
    setVolume: vi.fn(), setEnabled: vi.fn() };
  return { store, music };
}

describe('screen music', () => {
  it.each(['map', 'start', 'settings', 'stop', 'savecode', 'done', 'onboarding'])(
    'uses hq for %s', (name) => {
      const { store } = setup(); store.screen.value = { name, missionId: client.id } as Screen;
      expect(musicTrack(store)).toBe('hq');
    },
  );
  it.each<[string, MusicTrack]>([['login', 'hq'], ['client', 'terminal'], ['terminal', 'terminal'],
    ['bootcamp', 'bootcamp'], ['m7-graduation', 'graduation']])('chooses %s music', (missionId, track) => {
    const { store } = setup(); store.screen.value = { name: 'player', missionId };
    expect(musicTrack(store)).toBe(track);
  });
  it('matches the playground by name without extending Screen', () => {
    const { store } = setup(); store.screen.value = { name: 'playground' } as unknown as Screen;
    expect(musicTrack(store)).toBe('playground');
  });
  it.each(['typing-game', 'key-find'])('stops for %s only while that step is active', (kind) => {
    const mission = { ...client, steps: [{ ...client.steps[0]!, config: { kind } as StepConfig }] };
    const store = createStore({ ...fakeDeps(), registry: fixtureRegistry([mission]) });
    store.screen.value = { name: 'player', missionId: client.id };
    store.position.value = { phase: 'intro', index: 0 }; expect(musicTrack(store)).toBe('terminal');
    store.position.value = { phase: 'step', index: 0 }; expect(musicTrack(store)).toBeNull();
    store.position.value = { phase: 'success', index: 0 }; expect(musicTrack(store)).toBe('terminal');
  });

  it('waits for a gesture, follows screens and steps, retries on gestures, and disposes', () => {
    const { store, music } = setup(); const gestures = new EventTarget();
    const stop = startMusicFollow(store, music, store.voice, gestures);
    expect(music.play).not.toHaveBeenCalled();
    store.go({ name: 'map' }); gestures.dispatchEvent(new Event('pointerdown'));
    expect(music.play).toHaveBeenLastCalledWith('hq');
    store.openMission('bootcamp'); expect(music.play).toHaveBeenLastCalledWith('bootcamp');
    gestures.dispatchEvent(new Event('keydown')); expect(music.play).toHaveBeenLastCalledWith('bootcamp');
    store.registry.missions.find((m) => m.id === 'bootcamp')!.steps[0]!.config = { kind: 'key-find' } as StepConfig;
    store.position.value = { phase: 'step', index: 0 }; expect(music.play).toHaveBeenLastCalledWith(null);
    store.position.value = { phase: 'outro', index: 0 }; expect(music.play).toHaveBeenLastCalledWith('bootcamp');
    stop(); vi.mocked(music.play).mockClear();
    store.go({ name: 'map' }); gestures.dispatchEvent(new Event('pointerdown'));
    expect(music.play).not.toHaveBeenCalled();
  });

  it('ducks for real voice lifecycle events and removes the subscription', () => {
    const clips: { onended: (() => void) | null }[] = [];
    class Clip {
      onended = null; onerror = null; volume = 1;
      play = () => Promise.resolve(); pause = () => {};
      constructor() { clips.push(this); }
    }
    const voice = createVoice({ Audio: Clip as unknown as typeof Audio, synth: null, Utterance: null });
    voice.setManifest({ lines: { 'bit|Hello': 'hello.mp3' }, sfx: {} });
    const { store, music } = setup();
    const stop = startMusicFollow(store, music, voice, new EventTarget());
    voice.speak({ text: 'Hello' }); expect(music.duck).toHaveBeenLastCalledWith(true);
    clips[0]!.onended?.(); expect(music.duck).toHaveBeenLastCalledWith(false);
    voice.speak({ text: 'Hello' }); voice.cancel(); expect(music.duck).toHaveBeenLastCalledWith(false);
    stop(); vi.mocked(music.duck).mockClear(); voice.speak({ text: 'Hello' });
    expect(music.duck).not.toHaveBeenCalled(); voice.cancel();
  });
});

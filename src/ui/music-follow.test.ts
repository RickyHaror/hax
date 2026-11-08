import { describe, expect, it, vi } from 'vitest';
import { createVoice } from '../engine/voice';
import type { MusicPlayer, MusicTrack } from '../engine/music';
import type { Mission, Season, StepConfig } from '../engine/types';
import { createStore, type Screen } from './store';
import { musicTrack, startMusicFollow } from './music-follow';
import { client, fixtureRegistry, login } from './test/fixtures';
import { fakeDeps } from './test/helpers';

const tracks: Mission[] = [login, client,
  { ...client, id: 'terminal', order: 2, client: undefined, chapter: 'terminal' },
  { ...client, id: 'bootcamp', order: 3, client: undefined, chapter: 'bootcamp' },
  { ...client, id: 'finale', order: 4 },
];
function setup(source = tracks, seasons: Season[] = []) {
  const missions = source.map((mission) => ({ ...mission,
    steps: mission.steps.map((step) => ({ ...step, config: { ...step.config } })) }));
  const store = createStore({ ...fakeDeps(), registry: { ...fixtureRegistry(missions), seasons } });
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
    ['bootcamp', 'bootcamp'], ['finale', 'graduation']])('chooses %s music', (missionId, track) => {
    const { store } = setup(); store.screen.value = { name: 'player', missionId };
    expect(musicTrack(store)).toBe(track);
  });
  it('uses game order without seasons and ignores retired missions', () => {
    const retired = { ...client, id: 'old-finale', order: 20, retired: true };
    const last = { ...client, id: 'new-finale', order: 10 };
    const { store } = setup([last, retired, ...tracks]);
    for (const [missionId, expected] of [['new-finale', 'graduation'], ['finale', 'terminal'],
      ['old-finale', 'terminal'], ['missing', 'hq']]) {
      store.screen.value = { name: 'player', missionId: missionId! };
      expect(musicTrack(store)).toBe(expected);
    }
  });
  it('uses each season list instead of global mission order or playground unlocks', () => {
    const seasons: Season[] = [
      { id: 'first', number: 1, title: 'First', blurb: 'Help.', requires: null,
        missions: ['finale', 'client'] },
      { id: 'second', number: 2, title: 'Second', blurb: 'Help.', requires: 'first',
        missions: ['bootcamp', 'terminal'] },
    ];
    const { store } = setup(tracks, seasons);
    store.registry.playground = { ...store.registry.playground!, unlockedBy: 'bootcamp' };
    for (const [missionId, expected] of [['client', 'graduation'], ['terminal', 'graduation'],
      ['finale', 'terminal'], ['bootcamp', 'bootcamp'], ['missing', 'hq']]) {
      store.screen.value = { name: 'player', missionId: missionId! };
      expect(musicTrack(store)).toBe(expected);
    }
  });
  it('keeps typing and key steps quiet even in a finale', () => {
    for (const kind of ['typing-game', 'key-find']) {
      const finale = { ...client, id: 'quiet-finale', steps: [
        { ...client.steps[0]!, config: { kind } as StepConfig },
      ] };
      const { store } = setup([finale]);
      store.screen.value = { name: 'player', missionId: finale.id };
      store.position.value = { phase: 'intro', index: 0 };
      expect(musicTrack(store)).toBe('graduation');
      store.position.value = { phase: 'step', index: 0 };
      expect(musicTrack(store)).toBeNull();
      store.position.value = { phase: 'outro', index: 0 };
      expect(musicTrack(store)).toBe('graduation');
    }
  });
  it('uses hq for an empty registry', () => {
    const { store } = setup([]);
    store.screen.value = { name: 'player', missionId: 'missing' };
    expect(musicTrack(store)).toBe('hq');
  });
  it('matches the playground by name without extending Screen', () => {
    const { store } = setup(); store.screen.value = { name: 'playground' } as unknown as Screen;
    expect(musicTrack(store)).toBe('playground');
  });
  it.each(['typing-game', 'key-find'])('stops for %s only while that step is active', (kind) => {
    const mission = { ...client, steps: [{ ...client.steps[0]!, config: { kind } as StepConfig }] };
    const store = createStore({ ...fakeDeps(), registry: { ...fixtureRegistry([mission, tracks[4]!]), seasons: [] } });
    store.screen.value = { name: 'player', missionId: client.id };
    store.position.value = { phase: 'intro', index: 0 }; expect(musicTrack(store)).toBe('terminal');
    store.position.value = { phase: 'step', index: 0 }; expect(musicTrack(store)).toBeNull();
    store.position.value = { phase: 'success', index: 0 }; expect(musicTrack(store)).toBe('terminal');
  });

  it('waits for Begin, follows screens and steps, and disposes', () => {
    const { store, music } = setup();
    const follow = startMusicFollow(store, music, store.voice);
    expect(music.play).not.toHaveBeenCalled();
    store.go({ name: 'map' }); document.dispatchEvent(new Event('pointerdown'));
    document.dispatchEvent(new Event('keydown')); document.dispatchEvent(new Event('click'));
    expect(music.play).not.toHaveBeenCalled();
    follow.begin();
    expect(music.play).toHaveBeenLastCalledWith('hq');
    store.openMission('bootcamp'); expect(music.play).toHaveBeenLastCalledWith('bootcamp');
    store.registry.missions.find((m) => m.id === 'bootcamp')!.steps[0]!.config = { kind: 'key-find' } as StepConfig;
    store.position.value = { phase: 'step', index: 0 }; expect(music.play).toHaveBeenLastCalledWith(null);
    store.position.value = { phase: 'outro', index: 0 }; expect(music.play).toHaveBeenLastCalledWith('bootcamp');
    follow.stop(); vi.mocked(music.play).mockClear();
    store.go({ name: 'map' }); follow.begin();
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
    const follow = startMusicFollow(store, music, voice);
    voice.speak({ text: 'Hello' }); expect(music.duck).toHaveBeenLastCalledWith(true);
    clips[0]!.onended?.(); expect(music.duck).toHaveBeenLastCalledWith(false);
    voice.speak({ text: 'Hello' }); voice.cancel(); expect(music.duck).toHaveBeenLastCalledWith(false);
    follow.stop(); vi.mocked(music.duck).mockClear(); voice.speak({ text: 'Hello' });
    expect(music.duck).not.toHaveBeenCalled(); voice.cancel();
  });
});

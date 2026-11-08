import { describe, expect, it, vi } from 'vitest';
import { createVoice } from '../engine/voice';
import { codenameLines } from '../engine/codename';
import { createProgress, loadProgress, saveProgress, setCurrent, setIdentity, STORAGE_KEY, isUnlocked, toSaveCode, type StorageLike } from '../engine/progress';
import { createStore, type Screen } from './store';
import { client, dependent, fixtureRegistry } from './test/fixtures';
import { fakeDeps } from './test/helpers';
describe('app store', () => {
  it.each([false, true])('reads parts with legacy voice fallback, parts supported: %s', (supported) => {
    const deps = fakeDeps(), speakParts = vi.fn();
    if (supported) deps.voice.speakParts = speakParts;
    const store = createStore(deps), owner = Symbol('name');
    const whole = { text: 'Your name: Turbo Falcon', speaker: 'narrator' as const };
    const parts = codenameLines('Turbo', 'Falcon'), unavailable = vi.fn();
    store.readLine(owner, whole, 'pixel', unavailable, parts);
    const options = { sidekick: 'pixel', onEnd: expect.any(Function), onUnavailable: expect.any(Function) };
    if (supported) {
      expect(speakParts).toHaveBeenCalledWith(whole, parts, options);
      expect(deps.voice.speak).not.toHaveBeenCalled();
    } else expect(deps.voice.speak).toHaveBeenCalledWith(whole, options);
    expect(store.reading.value).toBe(owner);
    const callbacks = supported ? speakParts.mock.calls[0]![2] : vi.mocked(deps.voice.speak).mock.calls[0]![1]!;
    callbacks.onUnavailable(); callbacks.onUnavailable();
    expect(unavailable).toHaveBeenCalledOnce();
    store.readLine(owner, whole, undefined, unavailable, parts);
    expect(store.reading.value).toBeNull();
    callbacks.onUnavailable(); callbacks.onEnd();
    expect(unavailable).toHaveBeenCalledOnce();
  });

  it('clears line ownership when parts playback starts through the voice wrapper', () => {
    const deps = fakeDeps(), speakParts = vi.fn();
    deps.voice.speakParts = speakParts;
    const store = createStore(deps), whole = { text: 'Your name: Turbo Falcon' };
    store.readLine(Symbol('reader'), { text: 'Old line.' });
    store.voice.speakParts!(whole, codenameLines('Turbo', 'Falcon'));
    expect(store.reading.value).toBeNull();
    expect(speakParts).toHaveBeenCalledWith(whole, codenameLines('Turbo', 'Falcon'), undefined);
  });

  it.each(['idcard', 'stop'] as const)('preserves nested Back destinations from %s', (name) => {
    const store = createStore(fakeDeps()); store.identify(0, 0, 0);
    store.visit({ name }); store.visit({ name: 'parent' });
    store.back(); expect(store.screen.value).toEqual({ name });
    store.back(); expect(store.screen.value).toEqual({ name: 'map' });
  });

  it('returns from Stop through the parent panel to the exact mission and phase', () => {
    const store = createStore(fakeDeps()); store.identify(0, 0, 0);
    store.openMission(client.id); store.phase(client.id, { phase: 'step', index: 1 });
    store.visit({ name: 'stop' }); store.visit({ name: 'parent' });
    store.back(); expect(store.screen.value.name).toBe('stop');
    store.back(); expect(store.screen.value).toEqual({ name: 'player', missionId: client.id });
    expect(store.position.value).toEqual({ phase: 'step', index: 1 });
  });

  it.each([false, true])('ignores duplicate visits and discards stale returns, identity: %s', (identity) => {
    const deps = fakeDeps(); const store = createStore(deps);
    if (identity) store.identify(0, 0, 0);
    const home: Screen = { name: identity ? 'map' : 'start' };
    store.visit({ name: 'settings' }); store.visit({ name: 'settings' });
    store.visit({ name: 'parent' }); store.visit({ name: 'parent' });
    store.back(); expect(store.screen.value.name).toBe('settings');
    store.back(); expect(store.screen.value).toEqual(home);
    store.visit({ name: 'idcard' }); store.visit({ name: 'parent' });
    store.go(home); store.visit({ name: 'parent' });
    store.back(); expect(store.screen.value).toEqual(home);
    const cancel = vi.mocked(deps.voice.cancel); cancel.mockClear();
    store.back(); expect(store.screen.value).toEqual(home);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('reports an asynchronous clip failure once even while the manifest is supported', async () => {
    let reject!: (reason: Error) => void;
    const pending = new Promise<void>((_, fail) => { reject = fail; });
    class FailedAudio {
      onended = null; onerror = null;
      play = () => pending;
      pause = vi.fn();
    }
    const voice = createVoice({ synth: null, Utterance: null,
      Audio: FailedAudio as unknown as typeof Audio });
    voice.setManifest({ lines: { 'Bit|Hello': 'hello.mp3' }, sfx: {} });
    const store = createStore({ ...fakeDeps(), voice });
    const owner = Symbol('reader'), unavailable = vi.fn();
    store.readLine(owner, { text: 'Hello' }, undefined, unavailable);
    expect(store.reading.value).toBe(owner);
    reject(Error('Unavailable'));
    await pending.catch(() => {});
    expect(voice.supported).toBe(true);
    expect(unavailable).toHaveBeenCalledOnce();
    expect(store.reading.value).toBeNull();
    expect(voice.isSpeaking()).toBe(false);
  });

  it('deduplicates unavailable callbacks and ignores callbacks from canceled reading', () => {
    const deps = fakeDeps(), store = createStore(deps);
    const unavailable = vi.fn(), owner = Symbol('reader');
    store.readLine(owner, { text: 'Hello' }, undefined, unavailable);
    const first = vi.mocked(deps.voice.speak).mock.calls[0]![1]!;
    first.onUnavailable!(); first.onUnavailable!(); first.onEnd!(); first.onUnavailable!();
    expect(unavailable).toHaveBeenCalledOnce();
    expect(store.reading.value).toBeNull();
    store.readLine(owner, { text: 'Hello' }, undefined, unavailable);
    const second = vi.mocked(deps.voice.speak).mock.calls[1]![1]!;
    store.voice.cancel(); second.onUnavailable!(); second.onEnd!();
    expect(unavailable).toHaveBeenCalledOnce();
    expect(store.reading.value).toBeNull();
  });

  it('sets voice context at creation, identity, mission, screen and restore changes', () => {
    const deps = fakeDeps();
    const store = createStore(deps);
    expect(deps.voice.setContext).toHaveBeenLastCalledWith({ sidekick: 'Bit', missionId: null });
    store.identify(0, 0, 1);
    expect(deps.voice.setContext).toHaveBeenLastCalledWith({ sidekick: 'Pixel', missionId: null });
    store.openMission(client.id);
    expect(deps.voice.setContext).toHaveBeenLastCalledWith({ sidekick: 'Pixel', missionId: client.id });
    const resumed = createStore(deps);
    expect(deps.voice.setContext).toHaveBeenLastCalledWith({ sidekick: 'Pixel', missionId: client.id });
    resumed.visit({ name: 'settings' });
    expect(deps.voice.setContext).toHaveBeenLastCalledWith({ sidekick: 'Pixel', missionId: null });
    resumed.back();
    expect(deps.voice.setContext).toHaveBeenLastCalledWith({ sidekick: 'Pixel', missionId: client.id });
    resumed.go({ name: 'player', missionId: 'login' });
    expect(deps.voice.setContext).toHaveBeenLastCalledWith({ sidekick: 'Pixel', missionId: 'login' });
    resumed.complete('login');
    expect(deps.voice.setContext).toHaveBeenLastCalledWith({ sidekick: 'Pixel', missionId: null });
    const restored = setIdentity(createProgress(), { firstWord: 1, secondWord: 1, sidekick: 2 });
    expect(resumed.restore(toSaveCode(restored, deps.registry.missions)).ok).toBe(true);
    expect(deps.voice.setContext).toHaveBeenLastCalledWith({ sidekick: 'Hoot', missionId: null });
  });

  it('tracks failed saves and recovers when storage works again', () => {
    const deps = fakeDeps();
    const storage: StorageLike = { ...deps.storage, setItem() { throw new Error('Storage unavailable'); } };
    const store = createStore({ ...deps, storage });
    store.identify(0, 0, 0);
    expect(store.saved.value).toBe(false);
    store.complete(client.id);
    expect(store.progress.value.completed.client).toBeTruthy();
    expect(store.saved.value).toBe(false);
    storage.setItem = deps.storage.setItem;
    store.settings({ muted: true });
    expect(store.saved.value).toBe(true);
    expect(loadProgress(storage)).toEqual(store.progress.value);
    const missing = createStore({ ...deps, storage: null });
    missing.complete(client.id);
    expect(missing.saved.value).toBe(false);
  });

  it('reconciles newly registered bits before resume, unlocks dependents, and saves the result', () => {
    const deps = fakeDeps();
    const added = { ...client, bit: 5 };
    deps.registry = fixtureRegistry([added, dependent]);
    const progress = setIdentity(createProgress(), { firstWord: 0, secondWord: 0, sidekick: 0 });
    saveProgress(deps.storage, { ...progress, extraBits: (1 << 5) | (1 << 23),
      current: { missionId: added.id, stepId: 'answer' } });
    const store = createStore(deps);
    expect(store.progress.value.completed).toEqual({ client: deps.now().toISOString() });
    expect(store.progress.value.extraBits).toBe(1 << 23);
    expect(store.progress.value.current).toBeNull();
    expect(store.screen.value.name).toBe('map');
    expect(isUnlocked(store.progress.value, dependent)).toBe(true);
    expect(store.saved.value).toBe(true);
    expect(loadProgress(deps.storage)).toEqual(store.progress.value);
    store.openMission(dependent.id);
    expect(store.screen.value).toEqual({ name: 'player', missionId: dependent.id });
    expect(createStore(deps).progress.value.completed).toEqual(store.progress.value.completed);
  });

  it('starts fresh or on the map when identity is saved', () => {
    const deps = fakeDeps();
    expect(createStore(deps).screen.value).toEqual({ name: 'start' });
    const store = createStore(deps); store.identify(1, 2, 1);
    expect(createStore(deps).screen.value).toEqual({ name: 'map' });
    expect(deps.storage.setItem).toHaveBeenCalled();
  });
  it('saves and resumes every player phase, including success and outro', () => {
    const deps = fakeDeps(); const store = createStore(deps); store.identify(0, 0, 0);
    store.openMission(client.id);
    for (const phase of ['intro', 'permission', 'step', 'success', 'outro'] as const) {
      store.phase(client.id, { phase, index: 1 });
      const resumed = createStore(deps);
      expect(resumed.screen.value).toEqual({ name: 'player', missionId: client.id });
      expect(resumed.position.value).toEqual({ phase, index: 1 });
    }
    store.hint(client.id, 'answer', 3);
    expect(createStore(deps).progress.value.hints.client?.answer).toEqual({ rung: 3, count: 1 });
    store.complete(client.id);
    expect(createStore(deps).screen.value.name).toBe('map');
    expect(isUnlocked(createStore(deps).progress.value, dependent)).toBe(true);
    expect(deps.sound.play).toHaveBeenCalledWith('fanfare');
  });
  it('ignores missing, locked, completed, and invalid resume points safely', () => {
    const deps = fakeDeps();
    const progress = setIdentity(createProgress(), { firstWord: 0, secondWord: 0, sidekick: 0 });
    for (const missionId of ['missing', dependent.id]) {
      saveProgress(deps.storage, setCurrent(progress, { missionId, stepId: 'answer' }));
      const store = createStore(deps); expect(store.screen.value.name).toBe('map');
      store.openMission(dependent.id); expect(store.screen.value.name).toBe('map');
    }
    saveProgress(deps.storage, setCurrent(progress, { missionId: client.id, stepId: 'answer' }));
    expect(createStore(deps).position.value).toEqual({ phase: 'step', index: 1 });
    saveProgress(deps.storage, setCurrent(progress, { missionId: client.id, stepId: 'garbage' }));
    expect(createStore(deps).position.value.phase).toBe('intro');
    saveProgress(deps.storage, { ...progress, completed: { client: '2026-11-07T12:00:00Z' }, current: { missionId: client.id, stepId: 'answer' } });
    expect(createStore(deps).screen.value.name).toBe('map');
  });
  it('corrupt storage starts fresh and throwing storage is safe', () => {
    const deps = fakeDeps(); deps.storage.setItem(STORAGE_KEY, '{broken');
    expect(createStore(deps).screen.value.name).toBe('start');
    const store = createStore({ ...deps, storage: { getItem() { throw Error(); }, setItem() { throw Error(); }, removeItem() {} } });
    expect(() => store.identify(0, 0, 0)).not.toThrow();
  });
  it('persists settings and feeds the initial and changed mute to sound', () => {
    const deps = fakeDeps(); const store = createStore(deps);
    expect(deps.sound.setMuted).toHaveBeenCalledWith(false);
    store.settings({ muted: true, autoRead: false });
    expect(deps.sound.setMuted).toHaveBeenLastCalledWith(true);
    expect(createStore(deps).progress.value.settings).toMatchObject({ muted: true, autoRead: false });
    expect(deps.voice.cancel).toHaveBeenCalled();
  });
});

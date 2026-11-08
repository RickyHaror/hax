// @vitest-environment jsdom
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUDIO_GAINS, MUSIC_GAINS, type MusicPlayer } from '../../engine/music';
import { createStore } from '../store';
import { button, click, fakeDeps, mount, unmount } from '../test/helpers';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });
function setup() {
  const base = fakeDeps();
  const voice = { ...base.voice, setVolume: vi.fn(), setEnabled: vi.fn() };
  const sound = { ...base.sound, setVolume: vi.fn() };
  const music: MusicPlayer = { supported: true, play: vi.fn(), duck: vi.fn(),
    setVolume: vi.fn(), setEnabled: vi.fn() };
  const deps = { ...base, voice, sound, music };
  return { deps, store: createStore(deps) };
}
async function open() {
  const result = setup(); root = await mount(result.store);
  await click(root, 'Tap to begin, Agent!'); await click(root, 'Sound controls');
  return result;
}

describe('three audio channels', () => {
  it('applies loaded settings to the source players without writing progress', () => {
    const { store, deps } = setup();
    store.settings({ voices: { on: false, level: 'loud' }, sounds: { on: false, level: 'quiet' },
      music: { on: true, level: 'medium' }, musicLocked: true });
    vi.mocked(deps.storage.setItem).mockClear();
    deps.voice.setEnabled.mockClear(); deps.voice.setVolume.mockClear();
    deps.sound.setVolume.mockClear(); vi.mocked(deps.sound.setMuted).mockClear();
    vi.mocked(deps.music.setEnabled).mockClear(); vi.mocked(deps.music.setVolume).mockClear();
    const restored = createStore(deps);
    expect(restored.progress.value.settings).toEqual(store.progress.value.settings);
    expect(deps.storage.setItem).not.toHaveBeenCalled();
    expect(restored.saved.value).toBe(false);
    expect(deps.voice.setEnabled).toHaveBeenCalledExactlyOnceWith(false);
    expect(deps.voice.setVolume).toHaveBeenCalledExactlyOnceWith(AUDIO_GAINS.loud);
    expect(deps.sound.setMuted).toHaveBeenCalledExactlyOnceWith(true);
    expect(deps.sound.setVolume).toHaveBeenCalledExactlyOnceWith(AUDIO_GAINS.quiet);
    expect(deps.music.setEnabled).toHaveBeenCalledExactlyOnceWith(false);
    expect(deps.music.setVolume).toHaveBeenCalledExactlyOnceWith(MUSIC_GAINS.medium);
  });

  it('applies defaults on initialization and keeps every channel independent', async () => {
    const { store, deps } = await open();
    expect(deps.voice.setEnabled).toHaveBeenLastCalledWith(true);
    expect(deps.voice.setVolume).toHaveBeenLastCalledWith(AUDIO_GAINS.medium);
    expect(deps.sound.setVolume).toHaveBeenLastCalledWith(AUDIO_GAINS.medium);
    expect(deps.music.setVolume).toHaveBeenLastCalledWith(MUSIC_GAINS.quiet);
    for (const name of ['Voices', 'Sounds', 'Music']) {
      const before = store.progress.value.settings;
      await click(root, `${name} on`);
      expect(button(root, `${name} off`).getAttribute('aria-pressed')).toBe('false');
      for (const key of ['voices', 'sounds', 'music'] as const) {
        if (key !== name.toLowerCase()) expect(store.progress.value.settings[key]).toEqual(before[key]);
      }
      await click(root, `${name} off`);
      expect(button(root, `${name} on`).getAttribute('aria-pressed')).toBe('true');
    }
  });

  it('persists each level and switch across reload and applies them to players', async () => {
    const { deps, store } = await open();
    for (const name of ['Voices', 'Sounds', 'Music']) {
      for (const level of ['quiet', 'medium', 'loud']) {
        await click(root, `${name} ${level}`);
        expect(button(root, `${name} ${level}`).getAttribute('aria-pressed')).toBe('true');
      }
    }
    await click(root, 'Voices on');
    await click(root, 'Music on');
    const saved = store.progress.value.settings;
    await unmount(root); const restored = createStore(deps); root = await mount(restored);
    await click(root, 'Tap to begin, Agent!'); await click(root, 'Sound controls');
    expect(restored.progress.value.settings).toEqual(saved);
    expect(button(root, 'Music off').getAttribute('aria-pressed')).toBe('false');
    for (const name of ['Voices', 'Sounds', 'Music']) {
      expect(button(root, `${name} loud`).getAttribute('aria-pressed')).toBe('true');
    }
    expect(deps.voice.setVolume).toHaveBeenLastCalledWith(AUDIO_GAINS.loud);
    expect(deps.sound.setVolume).toHaveBeenLastCalledWith(AUDIO_GAINS.loud);
    expect(deps.music.setVolume).toHaveBeenLastCalledWith(MUSIC_GAINS.loud);
    expect(deps.music.setEnabled).toHaveBeenLastCalledWith(false);
  });

  it('master mute silences all channels without changing their own switches', async () => {
    const { store, deps } = await open(); const before = store.progress.value.settings;
    await click(root, 'Sound on');
    expect(deps.voice.setEnabled).toHaveBeenLastCalledWith(false);
    expect(deps.sound.setMuted).toHaveBeenLastCalledWith(true);
    expect(deps.music.setEnabled).toHaveBeenLastCalledWith(false);
    expect(store.progress.value.settings).toEqual({ ...before, muted: true });
    await click(root, 'Music on'); await click(root, 'Sound off');
    expect(deps.voice.setEnabled).toHaveBeenLastCalledWith(true);
    expect(deps.sound.setMuted).toHaveBeenLastCalledWith(false);
    expect(deps.music.setEnabled).toHaveBeenLastCalledWith(false);
  });

  it.each(['master', 'voices'])('clears read-aloud feedback when %s turns speech off', async (channel) => {
    const { store, deps } = await open();
    await act(() => store.readLine(Symbol('line'), { text: 'Hello.' }));
    expect(store.reading.value).not.toBeNull();
    await act(() => store.settings(channel === 'master'
      ? { muted: true } : { voices: { on: false, level: 'medium' } }));
    expect(store.reading.value).toBeNull();
    expect(deps.voice.cancel).toHaveBeenCalled();
    expect(deps.voice.setEnabled).toHaveBeenLastCalledWith(false);
  });

  it('keeps locked music off in the panel, Settings, and after loading', async () => {
    const { deps, store } = await open();
    await act(() => store.settings({ musicLocked: true }));
    expect(button(root, 'Music off').disabled).toBe(true);
    expect(root.textContent).toContain('Music is locked off by a grown-up.');
    await click(root, 'Music loud'); await click(root, 'Sound on'); await click(root, 'Sound off');
    expect(deps.music.setEnabled).toHaveBeenLastCalledWith(false);
    await act(() => store.visit({ name: 'settings' }));
    expect(button(root, 'Music off').disabled).toBe(true);
    expect(root.querySelector('.audio-panel')).toBeNull();
    expect(button(root, 'Voices on')).toBeTruthy();
    createStore(deps); expect(deps.music.setEnabled).toHaveBeenLastCalledWith(false);
  });
});

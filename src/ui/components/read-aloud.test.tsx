import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVoice } from '../../engine/voice';
import { createStore, StoreContext } from '../store';
import { client, login } from '../test/fixtures';
import { button, click, fakeDeps, identityStore, mount, unmount } from '../test/helpers';
import { SpeechLine } from './SpeechLine';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });
const pressed = (element: Element) => element.getAttribute('aria-pressed');

describe('audio begin screen', () => {
  it('renders only the begin screen and keeps voice and sound idle until tapped', async () => {
    const deps = fakeDeps(); const store = createStore(deps);
    root = await mount(store);
    expect(root.querySelector('h1')?.textContent).toBe('AGENT HQ');
    expect(root.querySelectorAll('button')).toHaveLength(1);
    expect(root.textContent).not.toContain(login.intro[0]!.text);
    expect(deps.voice.speakAll).not.toHaveBeenCalled();
    expect(deps.voice.speak).not.toHaveBeenCalled();
    expect(deps.voice.cancel).not.toHaveBeenCalled();
    expect(deps.sound.play).not.toHaveBeenCalled();
    await click(root, 'Tap to begin, Agent!');
    expect(deps.sound.play).toHaveBeenCalledWith('click');
    expect(deps.voice.cancel).toHaveBeenCalled();
    expect(deps.voice.speakAll).toHaveBeenCalledWith([...login.intro, ...login.steps[0]!.lines]);
    expect(root.textContent).toContain('Username: agent');
  });

  it('requires a new tap on reload with saved identity and respects auto-read OFF', async () => {
    const deps = fakeDeps(); const store = identityStore(deps);
    store.settings({ autoRead: false }); store.openMission(client.id);
    vi.mocked(deps.voice.cancel).mockClear();
    root = await mount(createStore(deps));
    expect(root.querySelectorAll('button')).toHaveLength(1);
    expect(deps.voice.speakAll).not.toHaveBeenCalled();
    expect(deps.sound.play).not.toHaveBeenCalled();
    expect(deps.voice.cancel).not.toHaveBeenCalled();
    await click(root, 'Tap to begin, Agent!');
    expect(root.textContent).toContain(client.title);
    expect(deps.voice.speakAll).not.toHaveBeenCalled();
    await unmount(root); root = await mount(createStore(deps));
    expect(button(root, 'Tap to begin, Agent!')).toBeTruthy();
  });
});

describe('auto-read toggle', () => {
  it('shows distinct toggle states, reads current lines from the start, and cancels when off', async () => {
    const deps = fakeDeps(); const store = createStore(deps);
    store.settings({ autoRead: false });
    root = await mount(store); await click(root, 'Tap to begin, Agent!');
    const toggle = button(root, 'Read to me');
    expect(pressed(toggle)).toBe('false');
    expect(toggle.textContent).toBe('Read to me: OFF');
    expect(toggle.classList.contains('reading-on')).toBe(false);
    expect(root.querySelectorAll('[aria-label="Read to me"]')).toHaveLength(1);
    expect(toggle.querySelector('svg')).not.toBeNull();
    await click(root, 'Read to me');
    expect(pressed(toggle)).toBe('true');
    expect(toggle.textContent).toBe('Read to me: ON');
    expect(toggle.classList.contains('reading-on')).toBe(true);
    expect(deps.voice.speakAll).toHaveBeenLastCalledWith([...login.intro, ...login.steps[0]!.lines]);
    const onIcon = toggle.querySelector('svg')!.innerHTML;
    vi.mocked(deps.voice.cancel).mockClear();
    await click(root, 'Read to me');
    expect(deps.voice.cancel).toHaveBeenCalled();
    expect(pressed(toggle)).toBe('false');
    expect(toggle.querySelector('svg')!.innerHTML).not.toBe(onIcon);
    await click(root, 'Read to me');
    expect(deps.voice.speakAll).toHaveBeenCalledTimes(2);
    expect(deps.voice.speakAll).toHaveBeenLastCalledWith([...login.intro, ...login.steps[0]!.lines]);
  });
});

async function lines(deps = fakeDeps()) {
  const store = createStore(deps);
  root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<StoreContext.Provider value={store}>
    <SpeechLine line={{ text: 'First line.' }} sidekick="Pixel" />
    <SpeechLine line={{ text: 'Next line.' }} />
  </StoreContext.Provider>, root); });
  return { store, deps, readers: [...root.querySelectorAll<HTMLButtonElement>('[aria-label="Read aloud"]')] };
}

describe('line read aloud feedback', () => {
  it('shows Reading immediately, stops on the second press, and ignores stale endings', async () => {
    const { deps, readers } = await lines();
    const first = readers[0]!;
    await act(() => first.click());
    expect(pressed(first)).toBe('true'); expect(first.querySelector('.visually-hidden')?.textContent).toBe('Reading...');
    expect(first.classList.contains('line-reading')).toBe(true);
    expect(deps.voice.speak).toHaveBeenCalledWith({ text: 'First line.' },
      { sidekick: 'Pixel', onEnd: expect.any(Function), onUnavailable: expect.any(Function) });
    const oldEnd = vi.mocked(deps.voice.speak).mock.calls[0]![1]!.onEnd!;
    await act(() => first.click());
    expect(pressed(first)).toBe('false'); expect(first.textContent).toBe('Read aloud');
    expect(deps.voice.cancel).toHaveBeenCalledTimes(2);
    await act(() => first.click());
    await act(oldEnd);
    expect(pressed(first)).toBe('true');
    await act(vi.mocked(deps.voice.speak).mock.calls.at(-1)![1]!.onEnd!);
    expect(pressed(first)).toBe('false');
  });

  it('allows one active line and clears feedback on auto-read, navigation and unmount', async () => {
    const { store, deps, readers } = await lines();
    await act(() => readers[0]!.click());
    await act(() => readers[1]!.click());
    expect(pressed(readers[0]!)).toBe('false'); expect(pressed(readers[1]!)).toBe('true');
    await act(() => {
      const options = vi.mocked(deps.voice.speak).mock.calls[0]![1]!;
      options.onUnavailable!(); options.onEnd!();
    });
    expect(pressed(readers[1]!)).toBe('true');
    await act(() => store.voice.speakAll([{ text: 'New story.' }]));
    expect(pressed(readers[1]!)).toBe('false');
    await act(() => readers[0]!.click());
    await act(() => store.go({ name: 'map' }));
    expect(pressed(readers[0]!)).toBe('false');
    await act(() => readers[0]!.click());
    await unmount(root);
    expect(store.reading.value).toBeNull();
  });

  it('shows a kind message when speech and a matching clip are unavailable', async () => {
    const deps = { ...fakeDeps(), voice: createVoice({ synth: null, Utterance: null, Audio: null }) };
    const { readers } = await lines(deps);
    await act(() => readers[0]!.click());
    expect(root.querySelector('[role="status"]')?.textContent).toContain('This computer cannot talk.');
    expect(root.textContent).toContain('Ask a grown-up to turn on sound.');
    expect(pressed(readers[0]!)).toBe('false');
  });

  it('reports unavailable speech after a delayed voice lookup ends', async () => {
    const deps = fakeDeps(); deps.voice = { ...deps.voice, supported: false };
    const { readers } = await lines(deps);
    await act(() => readers[0]!.click());
    expect(pressed(readers[0]!)).toBe('true');
    await act(() => {
      const options = vi.mocked(deps.voice.speak).mock.calls[0]![1]!;
      options.onUnavailable!(); options.onEnd!();
    });
    expect(root.querySelector('[role="status"]')?.textContent).toContain('This computer cannot talk.');
    expect(pressed(readers[0]!)).toBe('false');
  });

  it('shows unavailable feedback when a recorded clip rejects without speech', async () => {
    const clip = document.createElement('audio');
    clip.play = vi.fn(() => Promise.reject(Error('Unavailable'))); clip.pause = vi.fn();
    const AudioStub = vi.fn(function () { return clip; }) as unknown as typeof Audio;
    const voice = createVoice({ synth: null, Utterance: null, Audio: AudioStub });
    voice.setManifest({ lines: { 'Pixel|First line.': 'first.mp3' }, sfx: {} });
    const { readers, store } = await lines({ ...fakeDeps(), voice });
    await act(async () => { readers[0]!.click(); await Promise.resolve(); });
    expect(voice.supported).toBe(true);
    expect(root.querySelector('[role="status"]')?.textContent).toContain('This computer cannot talk.');
    expect(pressed(readers[0]!)).toBe('false');
    expect(store.reading.value).toBeNull();
  });

  it('shows unavailable feedback when only remote English speech exists', async () => {
    const speak = vi.fn();
    const voice = createVoice({ Audio: null, Utterance: class {} as typeof SpeechSynthesisUtterance,
      synth: { cancel: vi.fn(), speak, getVoices: () => [
        { lang: 'en-US', localService: false, name: 'Remote' } as SpeechSynthesisVoice,
      ] } as unknown as SpeechSynthesis });
    const { readers } = await lines({ ...fakeDeps(), voice });
    await act(() => readers[0]!.click());
    expect(speak).not.toHaveBeenCalled();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('This computer cannot talk.');
    expect(pressed(readers[0]!)).toBe('false');
  });

  it('plays a recorded line without speech synthesis and ends feedback with the clip', async () => {
    const clip = document.createElement('audio');
    clip.play = vi.fn(() => Promise.resolve()); clip.pause = vi.fn();
    const AudioStub = vi.fn(function () { return clip; }) as unknown as typeof Audio;
    const voice = createVoice({ synth: null, Utterance: null, Audio: AudioStub });
    voice.setManifest({ lines: { 'Pixel|First line.': 'first.mp3' }, sfx: {} });
    const { readers } = await lines({ ...fakeDeps(), voice });
    await act(() => readers[0]!.click());
    expect(clip.play).toHaveBeenCalledOnce();
    expect(pressed(readers[0]!)).toBe('true');
    await act(() => { clip.dispatchEvent(new Event('ended')); });
    expect(pressed(readers[0]!)).toBe('false');
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('gives map read buttons the same visible playback state', async () => {
    root = await mount(identityStore()); await click(root, 'Tap to begin, Agent!');
    await click(root, 'Read aloud');
    expect(pressed(button(root, 'Read aloud'))).toBe('true');
    expect(button(root, 'Read aloud').querySelector('.visually-hidden')?.textContent).toBe('Reading...');
  });
});

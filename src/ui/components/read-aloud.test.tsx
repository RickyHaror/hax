import { readFileSync, readdirSync, statSync } from 'node:fs';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVoice } from '../../engine/voice';
import { codenameLines } from '../../engine/codename';
import { sidekicks } from '../../missions/sidekicks';
import { createStore, StoreContext } from '../store';
import { client, login } from '../test/fixtures';
import { button, click, fakeDeps, identityStore, mount, unmount } from '../test/helpers';
import { SpeechLine } from './SpeechLine';
import { SidekickBubble } from './SidekickBubble';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });
const pressed = (element: Element) => element.getAttribute('aria-pressed');
const unavailableCopy = "I can't read this line here.";

function remoteSpeech() {
  const speak = vi.fn();
  const synth = { cancel: vi.fn(), speak, getVoices: () => [
    { lang: 'en-US', localService: false, name: 'Remote' } as SpeechSynthesisVoice,
  ] } as unknown as SpeechSynthesis;
  return { synth, speak, Utterance: class {} as typeof SpeechSynthesisUtterance };
}

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
  it('passes parts through and cancels changed parts without canceling an unchanged reading', async () => {
    const deps = fakeDeps(), speakParts = vi.fn(); deps.voice.speakParts = speakParts;
    const store = createStore(deps), line = { text: 'Your name', speaker: 'narrator' as const };
    root = document.createElement('div'); document.body.append(root);
    const show = async (first: string) => act(() => render(<StoreContext.Provider value={store}>
      <SpeechLine line={line} parts={codenameLines(first, 'Falcon')} />
    </StoreContext.Provider>, root));
    await show('Turbo'); await click(root, 'Read aloud');
    expect(speakParts).toHaveBeenLastCalledWith(line, codenameLines('Turbo', 'Falcon'),
      { onEnd: expect.any(Function), onUnavailable: expect.any(Function) });
    expect(pressed(button(root, 'Read aloud'))).toBe('true');
    const oldOptions = speakParts.mock.calls[0]![2];
    await show('Turbo');
    expect(pressed(button(root, 'Read aloud'))).toBe('true');
    await show('Swift');
    expect(store.reading.value).toBeNull();
    expect(pressed(button(root, 'Read aloud'))).toBe('false');
    await click(root, 'Read aloud');
    expect(speakParts).toHaveBeenLastCalledWith(line, codenameLines('Swift', 'Falcon'), expect.any(Object));
    await act(() => { oldOptions.onUnavailable(); oldOptions.onEnd(); });
    expect(root.querySelector('[role="status"]')).toBeNull();
    expect(pressed(button(root, 'Read aloud'))).toBe('true');
    await act(() => speakParts.mock.calls[1]![2].onEnd());
    expect(pressed(button(root, 'Read aloud'))).toBe('false');
    expect(deps.voice.speak).not.toHaveBeenCalled();
  });

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
    const notice = root.querySelector('[role="status"]')!;
    const spokenLine = readers[0]!.closest('.speech-line')!;
    expect(notice.textContent?.trim()).toBe(unavailableCopy);
    expect(notice.parentElement).toBe(spokenLine);
    expect(readers[0]!.nextElementSibling).toBe(notice);
    expect(spokenLine.lastElementChild).toBe(notice);
    expect(readers[1]!.closest('.speech-line')!.querySelector('[role="status"]')).toBeNull();
    expect(root.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(pressed(readers[0]!)).toBe('false');
  });

  it('reports unavailable speech after a delayed voice lookup ends', async () => {
    const deps = fakeDeps(); deps.voice = { ...deps.voice, supported: false };
    const { readers } = await lines(deps);
    expect(root.querySelector('[role="status"]')).toBeNull();
    await act(() => readers[0]!.click());
    expect(root.querySelector('[role="status"]')).toBeNull();
    expect(pressed(readers[0]!)).toBe('true');
    await act(() => {
      const options = vi.mocked(deps.voice.speak).mock.calls[0]![1]!;
      options.onUnavailable!(); options.onEnd!();
    });
    expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe(unavailableCopy);
    expect(pressed(readers[0]!)).toBe('false');
    await act(() => readers[0]!.click());
    expect(root.querySelector('[role="status"]')).toBeNull();
    expect(pressed(readers[0]!)).toBe('true');
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
    expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe(unavailableCopy);
    expect(pressed(readers[0]!)).toBe('false');
    expect(store.reading.value).toBeNull();
  });

  it('shows unavailable feedback when only remote English speech exists', async () => {
    const speech = remoteSpeech();
    const voice = createVoice({ Audio: null, ...speech });
    const { readers } = await lines({ ...fakeDeps(), voice });
    await act(() => readers[0]!.click());
    expect(speech.speak).not.toHaveBeenCalled();
    expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe(unavailableCopy);
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

  it.each([0, 1, 2])('plays buddy %s personality with its own clip despite remote voices', async (index) => {
    const buddy = sidekicks[index]!;
    const clip = document.createElement('audio');
    clip.play = vi.fn(() => Promise.resolve()); clip.pause = vi.fn();
    const AudioStub = vi.fn(function () { return clip; });
    const speech = remoteSpeech();
    const voice = createVoice({ ...speech, Audio: AudioStub as unknown as typeof Audio });
    voice.setManifest({ lines: { [`${buddy.id}|${buddy.personality.text}`]: 'buddy.mp3' }, sfx: {} });
    const deps = { ...fakeDeps(), voice };
    deps.registry = { ...deps.registry, sidekicks };
    const store = createStore(deps); store.settings({ autoRead: false });
    store.go({ name: 'onboarding' });
    root = await mount(store); await click(root, 'Tap to begin, Agent!');
    const card = root.querySelectorAll('.buddy-card')[index]!;
    const read = card.querySelector<HTMLButtonElement>('[aria-label="Read aloud"]')!;
    await act(() => read.click());
    expect(AudioStub).toHaveBeenCalledExactlyOnceWith('/audio/lines/buddy.mp3');
    expect(clip.play).toHaveBeenCalledOnce();
    expect(pressed(read)).toBe('true');
    expect(root.querySelector('.speech-unavailable')).toBeNull();
    await act(() => { clip.dispatchEvent(new Event('ended')); });
    expect(pressed(read)).toBe('false');
    expect(speech.speak).not.toHaveBeenCalled();
    expect(root.querySelector('.speech-unavailable')).toBeNull();
  });

  it('reads with an allowed local voice without an unavailable notice', async () => {
    const speech = remoteSpeech();
    speech.synth.getVoices = () => [
      { lang: 'en-US', localService: true, name: 'Local' } as SpeechSynthesisVoice,
    ];
    const voice = createVoice({ ...speech, Audio: null });
    const { readers } = await lines({ ...fakeDeps(), voice });
    await act(() => readers[0]!.click());
    expect(speech.speak).toHaveBeenCalledOnce();
    expect(root.querySelector('[role="status"]')).toBeNull();
    const utterance = speech.speak.mock.calls[0]![0] as SpeechSynthesisUtterance;
    expect(utterance.voice?.localService).toBe(true);
    await act(() => utterance.onend!(new Event('end') as SpeechSynthesisEvent));
    expect(pressed(readers[0]!)).toBe('false');
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('keeps unavailable automatic narration quiet until the line is tapped', async () => {
    const voice = createVoice({ ...remoteSpeech(), Audio: null });
    const speakAll = vi.spyOn(voice, 'speakAll');
    const { store } = await lines({ ...fakeDeps(), voice });
    const story = [{ text: 'First line.' }];
    await act(() => render(<StoreContext.Provider value={store}>
      <SidekickBubble lines={story} />
    </StoreContext.Provider>, root));
    expect(speakAll).toHaveBeenCalledWith(story);
    expect(voice.isSpeaking()).toBe(false);
    expect(root.querySelector('[role="status"]')).toBeNull();
    await click(root, 'Read aloud');
    expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe(unavailableCopy);
  });

  it('keeps an unavailable map notice beside its own read button', async () => {
    const voice = createVoice({ ...remoteSpeech(), Audio: null });
    root = await mount(identityStore({ ...fakeDeps(), voice }));
    await click(root, 'Tap to begin, Agent!');
    const read = button(root, 'Read aloud');
    const card = read.closest('.map-card')!;
    await act(() => read.click());
    const notice = root.querySelector('.speech-unavailable')!;
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.textContent?.trim()).toBe(unavailableCopy);
    expect(notice.parentElement).toBe(card);
    expect(read.nextElementSibling).toBe(notice);
    for (const other of root.querySelectorAll('.map-card')) {
      if (other !== card) expect(other.querySelector('.speech-unavailable')).toBeNull();
    }
  });

  it('removes the old unavailable copy from every source file', () => {
    const oldCopy = [
      ['This computer', 'cannot talk.'].join(' '),
      ['Ask a grown-up', 'to turn on sound.'].join(' '),
    ];
    for (const path of readdirSync('src', { recursive: true, encoding: 'utf8' })) {
      const file = `src/${path}`;
      if (!statSync(file).isFile()) continue;
      const source = readFileSync(file, 'utf8');
      for (const copy of oldCopy) expect(source, file).not.toContain(copy);
    }
  });

  it('gives map read buttons the same visible playback state', async () => {
    root = await mount(identityStore()); await click(root, 'Tap to begin, Agent!');
    await click(root, 'Read aloud');
    expect(pressed(button(root, 'Read aloud'))).toBe('true');
    expect(button(root, 'Read aloud').querySelector('.visually-hidden')?.textContent).toBe('Reading...');
  });
});

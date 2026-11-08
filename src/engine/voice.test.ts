// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVoice, pickVoice, SPEECH_RATE } from './voice';

class TestUtterance {
  rate = 1;
  lang = '';
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly text: string) {}
}

function voice(lang: string, localService = true): SpeechSynthesisVoice {
  return { lang, localService, default: false, name: lang, voiceURI: lang };
}

function setup() {
  const utterances: TestUtterance[] = [];
  const synth = Object.assign(new EventTarget(), {
    cancel: vi.fn(), getVoices: vi.fn((): SpeechSynthesisVoice[] => [voice('en-US')]),
    speak: vi.fn((utterance: TestUtterance) => { utterances.push(utterance); }),
  });
  const deps = {
    synth: synth as unknown as SpeechSynthesis,
    Utterance: TestUtterance as unknown as typeof SpeechSynthesisUtterance,
  };
  return { synth, utterances, deps, player: createVoice(deps) };
}

afterEach(() => vi.unstubAllGlobals());

describe('voice selection', () => {
  it('prefers local English, ordered US, GB, then other English', () => {
    const remote = voice('en-US', false);
    const other = voice('en-AU');
    const gb = voice('EN-gb');
    const us = voice('EN-us');
    const french = voice('fr-FR');
    expect(pickVoice([remote, french, other, gb, us])).toBe(us);
    expect(pickVoice([remote, french, other, gb])).toBe(gb);
    expect(pickVoice([remote, french, other])).toBe(other);
    expect(pickVoice([french, remote])).toBeNull();
    expect(pickVoice([french])).toBeNull();
    expect(pickVoice([])).toBeNull();
  });
});

describe('speech playback', () => {
  it('uses say, the gentle rate, and cancels previous speech', () => {
    const { player, synth, utterances } = setup();
    const oldEnd = vi.fn();
    expect(player.supported).toBe(true);
    expect(player.isSpeaking()).toBe(false);
    player.speak({ text: 'First.' }, { onEnd: oldEnd });
    const previous = utterances[0]!;
    player.speak({ text: 'ls', say: 'L S' });
    expect(synth.cancel).toHaveBeenCalledTimes(2);
    expect(synth.cancel.mock.invocationCallOrder[1])
      .toBeLessThan(synth.speak.mock.invocationCallOrder[1]!);
    expect(utterances[1]).toMatchObject({ text: 'L S', rate: 0.9, lang: 'en-US', voice: voice('en-US') });
    expect(SPEECH_RATE).toBe(0.9);
    previous.onend?.();
    previous.onerror?.();
    expect(oldEnd).not.toHaveBeenCalled();
    expect(player.isSpeaking()).toBe(true);
    utterances[1]!.onend?.();
    expect(player.isSpeaking()).toBe(false);
  });

  it('recognizes late local voices and reselects after voiceschanged', () => {
    const { player, synth, utterances } = setup();
    synth.getVoices.mockReturnValue([]);
    expect(player.supported).toBe(false);
    const onEnd = vi.fn();
    player.speak({ text: 'Wait.' }, { onEnd });
    expect(synth.speak).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledOnce();
    const first = voice('en-AU');
    synth.getVoices.mockReturnValue([first]);
    synth.dispatchEvent(new Event('voiceschanged'));
    expect(player.supported).toBe(true);
    player.speakAll([{ text: 'One.' }, { text: 'Two.' }]);
    expect(utterances[0]!.voice).toBe(first);
    const loaded = voice('en-GB');
    synth.getVoices.mockReturnValue([loaded]);
    synth.dispatchEvent(new Event('voiceschanged'));
    utterances[0]!.onend?.();
    expect(utterances[1]).toMatchObject({ voice: loaded, lang: 'en-GB', rate: SPEECH_RATE });
  });

  it('finishes a queue safely when its local voices disappear', () => {
    const { player, synth, utterances } = setup();
    const onEnd = vi.fn();
    player.speakAll([{ text: 'One.' }, { text: 'Two.' }], { onEnd });
    synth.getVoices.mockReturnValue([voice('en-US', false)]);
    synth.dispatchEvent(new Event('voiceschanged'));
    utterances[0]!.onend?.();
    expect(player.supported).toBe(false);
    expect(player.isSpeaking()).toBe(false);
    expect(synth.speak).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('advances only on end or error and completes once after the last line', () => {
    const { player, utterances } = setup();
    const onEnd = vi.fn();
    player.speakAll([{ text: 'One.' }, { text: 'Two.' }, { text: 'Three.' }], { onEnd });
    expect(utterances.map((item) => item.text)).toEqual(['One.']);
    utterances[0]!.onend?.();
    utterances[0]!.onerror?.();
    expect(utterances.map((item) => item.text)).toEqual(['One.', 'Two.']);
    utterances[1]!.onerror?.();
    expect(utterances.map((item) => item.text)).toEqual(['One.', 'Two.', 'Three.']);
    expect(onEnd).not.toHaveBeenCalled();
    utterances[2]!.onend?.();
    utterances[2]!.onerror?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(player.isSpeaking()).toBe(false);
  });

  it('invalidates callbacks before browser cancel events, then clears the queue', () => {
    const { player, synth, utterances } = setup();
    const onEnd = vi.fn();
    player.speakAll([{ text: 'One.' }, { text: 'Two.' }], { onEnd });
    synth.cancel.mockImplementation(() => utterances[0]!.onerror?.());
    player.cancel();
    utterances[0]!.onend?.();
    expect(synth.cancel).toHaveBeenCalledTimes(2);
    expect(utterances).toHaveLength(1);
    expect(onEnd).not.toHaveBeenCalled();
    expect(player.isSpeaking()).toBe(false);
  });

  it('skips empty spoken text and finishes empty queues', () => {
    const { player, utterances } = setup();
    const onEnd = vi.fn();
    player.speakAll([{ text: '' }, { text: 'Hidden.', say: '' }, { text: '  ' },
      { text: 'Visible.', say: 'Read this.' }], { onEnd });
    expect(utterances.map((item) => item.text)).toEqual(['Read this.']);
    utterances[0]!.onend?.();
    player.speakAll([], { onEnd });
    player.speak({ text: '' }, { onEnd });
    expect(onEnd).toHaveBeenCalledTimes(3);
    expect(player.isSpeaking()).toBe(false);
  });

  it('keeps independent playback state in separate factories', () => {
    const first = setup();
    const second = setup();
    first.player.speak({ text: 'Hello.' });
    second.player.cancel();
    expect(first.player.isSpeaking()).toBe(true);
    expect(second.player.isSpeaking()).toBe(false);
  });
});

describe('speech availability and failures', () => {
  it.each([{ voices: [] }, { voices: [voice('en-US', false)] }, { voices: [voice('fr-FR')] }])(
    'never uses a default or remote voice without local English: $voices', ({ voices }) => {
      const { player, synth } = setup();
      synth.getVoices.mockReturnValue(voices);
      const onEnd = vi.fn();
      expect(player.supported).toBe(false);
      player.speak({ text: 'Hello.' }, { onEnd });
      player.speakAll([{ text: 'One.' }, { text: 'Two.' }], { onEnd });
      expect(synth.speak).not.toHaveBeenCalled();
      expect(player.isSpeaking()).toBe(false);
      expect(onEnd).toHaveBeenCalledTimes(2);
    },
  );

  it('speaks with the local voice from a mixed list', () => {
    const { player, synth, utterances } = setup();
    const local = voice('en-GB');
    synth.getVoices.mockReturnValue([voice('en-US', false), local]);
    player.speak({ text: 'Hello.' });
    expect(player.supported).toBe(true);
    expect(utterances[0]!.voice).toBe(local);
  });

  it('uses browser globals by default', () => {
    const { deps, synth } = setup();
    vi.stubGlobal('speechSynthesis', deps.synth);
    vi.stubGlobal('SpeechSynthesisUtterance', deps.Utterance);
    const player = createVoice();
    player.speak({ text: 'Hello.' });
    expect(player.supported).toBe(true);
    expect(synth.speak).toHaveBeenCalledOnce();
  });

  it('is a safe no-op without either API and still completes calls', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    const fixture = setup();
    for (const deps of [{}, { ...fixture.deps, synth: null },
      { ...fixture.deps, Utterance: null }]) {
      const player = createVoice(deps);
      const onEnd = vi.fn();
      expect(player.supported).toBe(false);
      expect(() => {
        player.speak({ text: 'Hello.' }, { onEnd });
        player.speakAll([{ text: 'Hello.' }], { onEnd });
        player.cancel();
      }).not.toThrow();
      expect(onEnd).toHaveBeenCalledTimes(2);
      expect(player.isSpeaking()).toBe(false);
    }
    expect(fixture.synth.speak).not.toHaveBeenCalled();
    expect(fixture.synth.cancel).not.toHaveBeenCalled();
  });

  it.each(['getVoices', 'speak', 'cancel'] as const)('catches throwing %s APIs', (method) => {
    const { player, synth, utterances } = setup();
    synth[method].mockImplementation(() => { throw new Error('Unavailable'); });
    const onEnd = vi.fn();
    expect(() => player.speak({ text: 'Hello.' }, { onEnd })).not.toThrow();
    utterances[0]?.onend?.();
    if (method === 'cancel') expect(synth.speak).not.toHaveBeenCalled();
    expect(player.isSpeaking()).toBe(false);
    expect(onEnd).toHaveBeenCalledOnce();
    expect(() => player.cancel()).not.toThrow();
  });

  it('catches a throwing utterance constructor and invalidates pending events', () => {
    const { deps, synth, utterances } = setup();
    const Throwing = class { constructor() { throw new Error('Unavailable'); } };
    const player = createVoice({ ...deps, Utterance: Throwing as unknown as typeof SpeechSynthesisUtterance });
    const onEnd = vi.fn();
    expect(() => player.speak({ text: 'Hello.' }, { onEnd })).not.toThrow();
    expect(onEnd).toHaveBeenCalledOnce();
    expect(player.isSpeaking()).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
    synth.speak.mockImplementation((item) => { utterances.push(item); throw new Error('Blocked'); });
    const other = createVoice(deps);
    other.speakAll([{ text: 'One.' }, { text: 'Two.' }], { onEnd });
    utterances[0]!.onend?.();
    expect(onEnd).toHaveBeenCalledTimes(2);
    expect(utterances).toHaveLength(1);
  });
});

function recordedSetup() {
  const fixture = setup();
  const clips: TestAudio[] = [];
  class TestAudio {
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    currentTime = 0;
    play = vi.fn((): Promise<void> => Promise.resolve());
    pause = vi.fn();
    constructor(readonly src: string) { clips.push(this); }
  }
  const Audio = TestAudio as unknown as typeof globalThis.Audio;
  const player = createVoice({ ...fixture.deps, Audio });
  player.setManifest({ lines: {
    'bit|Hello': 'bit.mp3', 'pixel|Hello': 'pixel.mp3',
    'client:pizza|Hello': 'client.mp3', 'narrator|Hello': 'narrator.mp3',
  }, sfx: {} });
  return { ...fixture, player, clips, Audio };
}

describe('recorded voice playback', () => {
  it('plays default, selected, client, narrator and player voices', () => {
    const { player, clips, synth } = recordedSetup();
    player.speak({ text: '  Hello ' });
    expect(clips[0]!.src).toBe('/audio/lines/bit.mp3');
    player.setContext({ sidekick: 'pixel', missionId: 'pizza' });
    player.speakAll([{ text: 'Hello', speaker: 'sidekick' }, { text: 'Hello', speaker: 'client' },
      { text: 'Hello', speaker: 'narrator' }, { text: 'Hello', speaker: 'player' }]);
    for (let index = 1; index <= 4; index++) {
      expect(player.isSpeaking()).toBe(true);
      expect(clips[index]!.play).toHaveBeenCalledOnce();
      clips[index]!.onended?.();
    }
    expect(clips.map((clip) => clip.src)).toEqual(['/audio/lines/bit.mp3',
      '/audio/lines/pixel.mp3', '/audio/lines/client.mp3',
      '/audio/lines/narrator.mp3', '/audio/lines/narrator.mp3']);
    expect(player.isSpeaking()).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('uses the override only for sidekick lines and keeps the stored context', () => {
    const { player, clips } = recordedSetup();
    player.setContext({ sidekick: 'bit', missionId: 'pizza' });
    player.speakAll([{ text: 'Hello' }, { text: 'Hello', speaker: 'client' }], { sidekick: 'pixel' });
    clips[0]!.onended?.();
    expect(clips.map((clip) => clip.src)).toEqual(['/audio/lines/pixel.mp3', '/audio/lines/client.mp3']);
    player.speak({ text: 'Hello', speaker: 'sidekick' }, { sidekick: 'pixel' });
    expect(clips[2]!.src).toBe('/audio/lines/pixel.mp3');
    player.speak({ text: 'Hello' });
    expect(clips[3]!.src).toBe('/audio/lines/bit.mp3');
  });

  it('mixes clips and speech in order, honors say, and completes once', () => {
    const { player, clips, utterances } = recordedSetup();
    const onEnd = vi.fn();
    player.speakAll([{ text: 'Shown', say: 'Hello' }, { text: 'Missing' }, { text: 'Hello' }], { onEnd });
    expect(clips).toHaveLength(1);
    expect(utterances).toHaveLength(0);
    const ended = clips[0]!.onended!;
    ended(); ended();
    expect(utterances.map((item) => item.text)).toEqual(['Missing']);
    expect(clips).toHaveLength(1);
    utterances[0]!.onend?.();
    expect(clips).toHaveLength(2);
    expect(onEnd).not.toHaveBeenCalled();
    const lastEnd = clips[1]!.onended!;
    lastEnd(); lastEnd();
    expect(onEnd).toHaveBeenCalledOnce();
    expect(player.isSpeaking()).toBe(false);
  });

  it.each(['error', 'reject', 'throw'] as const)('falls back once on clip %s', async (failure) => {
    const { player, clips, utterances, Audio, deps } = recordedSetup();
    const FailedAudio = class extends Audio {
      override play = (): Promise<void> => {
        if (failure === 'throw') throw Error('Blocked');
        if (failure === 'reject') return Promise.reject(Error('Blocked'));
        return Promise.resolve();
      };
    };
    const failing = createVoice({ ...deps, Audio: FailedAudio });
    failing.setManifest({ lines: { 'bit|Hello': 'bit.mp3' }, sfx: {} });
    const onEnd = vi.fn();
    failing.speakAll([{ text: 'Hello' }, { text: 'Next' }], { onEnd });
    const error = clips[0]!.onerror;
    if (failure === 'error') { error?.(); error?.(); }
    await Promise.resolve();
    expect(utterances.map((item) => item.text)).toEqual(['Hello']);
    expect(failing.isSpeaking()).toBe(true);
    utterances[0]!.onend?.();
    expect(utterances.map((item) => item.text)).toEqual(['Hello', 'Next']);
    utterances[1]!.onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
    player.cancel();
  });

  it('cancels clips and speech, suppressing stale events and rejected play promises', async () => {
    const { player, clips, synth, utterances } = recordedSetup();
    const onEnd = vi.fn();
    player.speakAll([{ text: 'Hello' }, { text: 'Missing' }], { onEnd });
    const end = clips[0]!.onended!;
    const error = clips[0]!.onerror!;
    player.cancel(); end(); error();
    expect(clips[0]!.pause).toHaveBeenCalled();
    expect(synth.cancel).toHaveBeenCalledTimes(2);
    expect(utterances).toHaveLength(0);
    expect(player.isSpeaking()).toBe(false);
    player.speakAll([{ text: 'Missing' }, { text: 'Hello' }], { onEnd });

    player.cancel(); utterances[0]!.onend?.();
    expect(clips).toHaveLength(1);
    expect(onEnd).not.toHaveBeenCalled();

    let reject!: (reason: Error) => void;
    const pending = new Promise<void>((_, fail) => { reject = fail; });
    const { Audio, deps } = recordedSetup();
    const PendingAudio = class extends Audio { override play = () => pending; };
    const pendingPlayer = createVoice({ ...deps, Audio: PendingAudio });
    pendingPlayer.setManifest({ lines: { 'bit|Hello': 'bit.mp3' }, sfx: {} });
    pendingPlayer.speak({ text: 'Hello' }, { onEnd });
    pendingPlayer.cancel(); reject(Error('Stopped'));
    await Promise.resolve();
    expect(deps.synth.speak).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('plays clips without speech APIs and continues past unavailable speech', () => {
    const { Audio, clips } = recordedSetup();
    const player = createVoice({ Audio, synth: null, Utterance: null });
    player.setManifest({ lines: { 'bit|Hello': 'bit.mp3' }, sfx: {} });
    expect(player.supported).toBe(true);
    const onEnd = vi.fn();
    player.speakAll([{ text: 'Missing' }, { text: 'Hello' }], { onEnd });
    expect(player.isSpeaking()).toBe(true);
    clips[0]!.onended?.();
    expect(onEnd).toHaveBeenCalledOnce();
    expect(player.isSpeaking()).toBe(false);
  });

  it('falls back on a throwing Audio constructor and after manifest removal', () => {
    const { deps, utterances } = setup();
    const Broken = class { constructor() { throw Error('Unavailable'); } };
    const player = createVoice({ ...deps, Audio: Broken as unknown as typeof Audio });
    player.setManifest({ lines: { 'bit|Hello': 'bit.mp3' }, sfx: {} });
    player.speak({ text: 'Hello' });
    player.setManifest(null);
    player.speak({ text: 'Hello' });
    expect(utterances.map((item) => item.text)).toEqual(['Hello', 'Hello']);
  });
});

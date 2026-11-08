// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVoice, pickVoice, SPEECH_RATE } from './voice';
import { codenameLines } from './codename';

class TestUtterance {
  volume = 1;
  rate = 1;
  lang = '';
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly text: string) {}
}

function voice(lang: string, localService = true, name = lang): SpeechSynthesisVoice {
  return { lang, localService, default: false, name, voiceURI: name };
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

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('voice selection', () => {
  it('only picks local English, preferring US or CA', () => {
    const remote = voice('en-US', false);
    const other = voice('en-AU');
    const gb = voice('EN-gb');
    const us = voice('EN-us');
    const french = voice('fr-FR');
    const ca = voice('en-CA');
    expect(pickVoice([remote, french, other, gb, us])).toBe(us);
    expect(pickVoice([remote, french, other, gb, ca])).toBe(ca);
    expect(pickVoice([remote, french, other, gb, ca, us])).toBe(us);
    expect(pickVoice([remote, french, other, gb])).toBe(gb);
    expect(pickVoice([remote, french, other])).toBe(other);
    expect(pickVoice([french, remote])).toBeNull();
    expect(pickVoice([french])).toBeNull();
    expect(pickVoice([])).toBeNull();
  });

  it('orders shuffled inputs by locale, local Natural names, then name', () => {
    const alpha = voice('en-US', true, 'Alpha');
    const beta = voice('en-CA', true, 'Beta');
    const natural = voice('en-CA', true, 'Zed Natural');
    const otherNatural = voice('en-GB', true, 'Other Natural');
    const remoteNatural = voice('en-US', false, 'Remote Natural');
    const input = [beta, alpha, natural, otherNatural, remoteNatural];
    for (let index = 0; index < input.length; index++) {
      const shuffled = [...input.slice(index), ...input.slice(0, index)];
      expect(pickVoice(shuffled)).toBe(natural);
      expect(pickVoice([...shuffled].reverse())).toBe(natural);
    }
    expect(pickVoice([otherNatural, beta, alpha])).toBe(alpha);
    expect(pickVoice([beta, alpha])).toBe(alpha);
    expect(input).toEqual([beta, alpha, natural, otherNatural, remoteNatural]);
  });

  it('rejects every remote voice regardless of name or locale order', () => {
    const alpha = voice('en-US', false, 'Alpha');
    const natural = voice('en-CA', false, 'Zed Natural');
    const other = voice('en-GB', false, 'A Natural');
    expect(pickVoice([natural, other, alpha])).toBeNull();
    expect(pickVoice([alpha, other, natural].reverse())).toBeNull();
    expect(pickVoice([voice('enochian'), voice('fr-FR')])).toBeNull();
  });
});

describe('speech playback', () => {
  it('sets speech volume and reports playback, replacement, ending, and cancellation', () => {
    const { player, utterances, synth } = setup();
    const change = vi.fn(); const unsubscribe = player.onSpeakingChange(change);
    player.setVolume(0.35); player.speak({ text: 'Hello.' });
    expect(utterances[0]!.volume).toBe(0.35); expect(change).toHaveBeenLastCalledWith(true);
    player.setVolume(2); expect(utterances[0]!.volume).toBe(1);
    player.speak({ text: 'Next.' });
    expect(change.mock.calls).toEqual([[true], [false], [true]]);
    utterances[0]!.onend?.(); expect(change.mock.calls).toHaveLength(3);
    utterances[1]!.onend?.(); expect(change).toHaveBeenLastCalledWith(false);
    player.speak({ text: 'Again.' }); player.cancel();
    expect(change).toHaveBeenLastCalledWith(false);
    player.setEnabled(false); const end = vi.fn();
    player.speak({ text: 'Quiet.' }, { onEnd: end });
    expect(utterances).toHaveLength(3); expect(end).toHaveBeenCalledOnce();
    player.setEnabled(true); player.speak({ text: 'Back.' });
    expect(synth.speak).toHaveBeenCalledTimes(4);
    unsubscribe(); change.mockClear(); player.cancel(); expect(change).not.toHaveBeenCalled();
  });
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

  it('waits for voiceschanged and keeps the first voice when more voices load', () => {
    vi.useFakeTimers();
    const { player, synth, utterances } = setup();
    const add = vi.spyOn(synth, 'addEventListener');
    const remove = vi.spyOn(synth, 'removeEventListener');
    synth.getVoices.mockReturnValue([]);
    expect(player.supported).toBe(false);
    const onEnd = vi.fn();
    player.speakAll([{ text: 'Wait.' }, { text: 'Two.' }], { onEnd });
    expect(synth.speak).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
    expect(player.isSpeaking()).toBe(true);
    expect(add).toHaveBeenCalledWith('voiceschanged', expect.any(Function));
    const first = voice('en-AU');
    synth.getVoices.mockReturnValue([first]);
    synth.dispatchEvent(new Event('voiceschanged'));
    expect(player.supported).toBe(true);
    expect(utterances[0]!.voice).toBe(first);
    const loaded = voice('en-US', true, 'New Natural');
    synth.getVoices.mockReturnValue([loaded, first]);
    synth.dispatchEvent(new Event('voiceschanged'));
    expect(utterances).toHaveLength(1);
    utterances[0]!.onend?.();
    expect(utterances[1]!.voice).toBe(first);
    utterances[1]!.onend?.();
    vi.advanceTimersByTime(1500);
    expect(utterances).toHaveLength(2);
    expect(onEnd).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith('voiceschanged', add.mock.calls[0]![1]);
    expect(vi.getTimerCount()).toBe(0);
    player.speak({ text: 'Later.' });
    expect(utterances[2]!.voice).toBe(first);
  });

  it('reselects only when the cached voice disappears, then keeps its replacement', () => {
    const { player, synth, utterances } = setup();
    const first = voice('en-US');
    const replacement = voice('en-AU');
    const preferred = voice('en-CA', true, 'New Natural');
    synth.getVoices.mockReturnValue([first]);
    player.speakAll([{ text: 'One.' }, { text: 'Two.' }, { text: 'Three.' }]);
    expect(utterances[0]!.voice).toBe(first);
    synth.getVoices.mockReturnValue([replacement]);
    synth.dispatchEvent(new Event('voiceschanged'));
    utterances[0]!.onend?.();
    expect(utterances[1]!.voice).toBe(replacement);
    synth.getVoices.mockReturnValue([preferred, replacement]);
    synth.dispatchEvent(new Event('voiceschanged'));
    utterances[1]!.onend?.();
    expect(utterances[2]!.voice).toBe(replacement);
  });

  it('finishes a queue safely when all English voices disappear', () => {
    const { player, synth, utterances } = setup();
    const onEnd = vi.fn();
    player.speakAll([{ text: 'One.' }, { text: 'Two.' }], { onEnd });
    synth.getVoices.mockReturnValue([voice('fr-FR')]);
    synth.dispatchEvent(new Event('voiceschanged'));
    utterances[0]!.onend?.();
    expect(player.supported).toBe(false);
    expect(player.isSpeaking()).toBe(false);
    expect(synth.speak).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it.each([false, true])('uses the timeout safety net with late voices: %s', (loaded) => {
    vi.useFakeTimers();
    const { player, synth, utterances } = setup();
    const chosen = voice('en-CA');
    synth.getVoices.mockReturnValue([]);
    const onEnd = vi.fn();
    player.speakAll([{ text: 'One.' }, { text: 'Two.' }], { onEnd });
    vi.advanceTimersByTime(1499);
    expect(synth.speak).not.toHaveBeenCalled();
    expect(player.isSpeaking()).toBe(true);
    if (loaded) synth.getVoices.mockReturnValue([chosen]);
    vi.advanceTimersByTime(1);
    if (loaded) {
      expect(utterances[0]!.voice).toBe(chosen);
      utterances[0]!.onend?.();
      expect(utterances[1]!.voice).toBe(chosen);
      utterances[1]!.onend?.();
    } else expect(synth.speak).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledOnce();
    expect(player.isSpeaking()).toBe(false);
    synth.dispatchEvent(new Event('voiceschanged'));
    expect(vi.getTimerCount()).toBe(0);
    expect(utterances).toHaveLength(loaded ? 2 : 0);
  });

  it.each(['cancel', 'replace'] as const)('cleans up voice loading on %s', (action) => {
    vi.useFakeTimers();
    const { player, synth, utterances } = setup();
    const remove = vi.spyOn(synth, 'removeEventListener');
    synth.getVoices.mockReturnValue([]);
    const onEnd = vi.fn();
    player.speakAll([{ text: 'Old.' }, { text: 'Stale.' }], { onEnd });
    if (action === 'cancel') player.cancel();
    else player.speak({ text: 'New.' });
    expect(remove).toHaveBeenCalledWith('voiceschanged', expect.any(Function));
    synth.getVoices.mockReturnValue([voice('en-US')]);
    synth.dispatchEvent(new Event('voiceschanged'));
    vi.advanceTimersByTime(1500);
    expect(utterances.map((item) => item.text)).toEqual(action === 'cancel' ? [] : ['New.']);
    utterances[0]?.onend?.();
    expect(player.isSpeaking()).toBe(false);
    expect(onEnd).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
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
  it.each([{ voices: [voice('fr-FR')] }, { voices: [voice('enochian')] }])(
    'never uses a non-English default voice: $voices', ({ voices }) => {
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

  it('reports unavailable without ever using remote English', () => {
    const { player, synth } = setup();
    const remote = voice('en-CA', false);
    synth.getVoices.mockReturnValue([voice('fr-FR'), remote]);
    const onUnavailable = vi.fn(), onEnd = vi.fn();
    expect(player.supported).toBe(false);
    player.speak({ text: 'Hello.' }, { onUnavailable, onEnd });
    expect(synth.speak).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledOnce();
    expect(player.isSpeaking()).toBe(false);
  });

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
    volume = 1;
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

const nameWhole = { text: 'Your name: Turbo Falcon', speaker: 'narrator' as const };
const nameFiles = {
  'narrator|Your name is': 'prefix.mp3', 'narrator|Turbo': 'turbo.mp3', 'narrator|Falcon': 'falcon.mp3',
};

describe('recorded name parts', () => {
  it('plays all parts in order as one reading without synthesis', () => {
    const { player, clips, synth } = recordedSetup();
    player.setManifest({ lines: nameFiles, sfx: {} });
    player.setContext({ sidekick: 'hoot', missionId: 'pizza' });
    const onEnd = vi.fn(), onUnavailable = vi.fn(), change = vi.fn();
    player.onSpeakingChange(change);
    player.speakParts(nameWhole, codenameLines('Turbo', 'Falcon'), { onEnd, onUnavailable, sidekick: 'pixel' });
    for (let index = 0; index < 3; index++) {
      expect(clips).toHaveLength(index + 1);
      expect(player.isSpeaking()).toBe(true);
      expect(clips[index]!.play).toHaveBeenCalledOnce();
      expect(onEnd).not.toHaveBeenCalled();
      const end = clips[index]!.onended!;
      end(); end();
    }
    expect(clips.map((clip) => clip.src)).toEqual([
      '/audio/lines/prefix.mp3', '/audio/lines/turbo.mp3', '/audio/lines/falcon.mp3',
    ]);
    expect(synth.speak).not.toHaveBeenCalled();
    expect(onUnavailable).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledOnce();
    expect(change.mock.calls).toEqual([[true], [false]]);
    expect(player.isSpeaking()).toBe(false);
  });

  it.each(Object.keys(nameFiles).flatMap((missing) => [
    { missing, local: true }, { missing, local: false },
  ]))('falls back to the whole line for $missing, local voice: $local', ({ missing, local }) => {
    const { player, clips, synth, utterances } = recordedSetup();
    player.setManifest({ lines: Object.fromEntries(Object.entries(nameFiles)
      .filter(([key]) => key !== missing)), sfx: {} });
    synth.getVoices.mockReturnValue([voice('en-US', local)]);
    const onEnd = vi.fn(), onUnavailable = vi.fn();
    player.speakParts(nameWhole, codenameLines('Turbo', 'Falcon'), { onEnd, onUnavailable });
    expect(clips).toHaveLength(0);
    expect(utterances.map((item) => item.text)).toEqual(local ? [nameWhole.text] : []);
    if (local) utterances[0]!.onend?.();
    expect(onUnavailable).toHaveBeenCalledTimes(local ? 0 : 1);
    expect(onEnd).toHaveBeenCalledOnce();
    expect(player.isSpeaking()).toBe(false);
  });

  it('keeps the existing whole-line recording fallback', () => {
    const { player, clips, synth } = recordedSetup();
    player.setManifest({ lines: { 'narrator|Your name: Turbo Falcon': 'whole.mp3' }, sfx: {} });
    player.speakParts(nameWhole, codenameLines('Turbo', 'Falcon'));
    expect(clips[0]!.src).toBe('/audio/lines/whole.mp3');
    clips[0]!.onended?.();
    expect(clips).toHaveLength(1);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it.each(['manifest', 'Audio', 'parts'] as const)('uses the whole line without %s', (missing) => {
    const { deps, utterances } = setup();
    const { Audio, clips } = recordedSetup();
    const player = createVoice({ ...deps, Audio: missing === 'Audio' ? null : Audio });
    player.setManifest(missing === 'manifest' ? null : { lines: nameFiles, sfx: {} });
    player.speakParts(nameWhole, missing === 'parts' ? [] : codenameLines('Turbo', 'Falcon'));
    expect(utterances.map((item) => item.text)).toEqual([nameWhole.text]);
    expect(clips).toHaveLength(0);
  });

  it('stops mid-sequence and ignores stale events without finishing or reporting unavailable', () => {
    const { player, clips, synth } = recordedSetup();
    player.setManifest({ lines: nameFiles, sfx: {} });
    const onEnd = vi.fn(), onUnavailable = vi.fn();
    player.speakParts(nameWhole, codenameLines('Turbo', 'Falcon'), { onEnd, onUnavailable });
    clips[0]!.onended?.();
    const clip = clips[1]!, end = clip.onended!, error = clip.onerror!;
    clip.currentTime = 2;
    player.cancel(); end(); error();
    expect(clip.pause).toHaveBeenCalled();
    expect(clip.currentTime).toBe(0);
    expect(clip.onended).toBeNull();
    expect(clip.onerror).toBeNull();
    expect(clips).toHaveLength(2);
    expect(player.isSpeaking()).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
    expect(onUnavailable).not.toHaveBeenCalled();
  });

  it.each([false, true])('reports unavailable only if nothing was heard, heard: %s', (heard) => {
    const { player, clips, synth } = recordedSetup();
    synth.getVoices.mockReturnValue([voice('en-US', false)]);
    player.setManifest({ lines: nameFiles, sfx: {} });
    const onEnd = vi.fn(), onUnavailable = vi.fn();
    player.speakParts(nameWhole, codenameLines('Turbo', 'Falcon'), { onEnd, onUnavailable });
    if (heard) clips[0]!.onended?.();
    else clips[0]!.onerror?.();
    clips[1]!.onerror?.(); clips[2]!.onerror?.();
    expect(onEnd).toHaveBeenCalledOnce();
    expect(onUnavailable).toHaveBeenCalledTimes(heard ? 0 : 1);
    expect(synth.speak).not.toHaveBeenCalled();
  });
});

describe('recorded voice playback', () => {
  it('updates clip volume and ends ducking on disable, errors, and rejected playback', async () => {
    const { player, clips, synth } = recordedSetup();
    const change = vi.fn(); player.onSpeakingChange(change);
    player.setVolume(0.35); player.speak({ text: 'Hello' });
    expect(clips[0]!.volume).toBe(0.35);
    player.setVolume(0.7); expect(clips[0]!.volume).toBe(0.7);
    player.setEnabled(false); expect(clips[0]!.pause).toHaveBeenCalled();
    expect(change).toHaveBeenLastCalledWith(false);
    player.setEnabled(true); player.speak({ text: 'Hello' }); synth.getVoices.mockReturnValue([voice('fr-FR')]);
    clips[1]!.onerror?.(); expect(change).toHaveBeenLastCalledWith(false);
    clips[1]!.play.mockRejectedValue(Error('Blocked'));
    const Audio = vi.fn(function () { return clips[1]; }) as unknown as typeof globalThis.Audio;
    const rejected = createVoice({ Audio, synth: null, Utterance: null });
    rejected.setManifest({ lines: { 'bit|Hello': 'bit.mp3' }, sfx: {} });
    rejected.onSpeakingChange(change); rejected.speak({ text: 'Hello' });
    await Promise.resolve(); expect(change).toHaveBeenLastCalledWith(false);
  });
  it('plays clips with remote-only speech but never uses that speech for missing clips', () => {
    const { player, clips, synth } = recordedSetup();
    synth.getVoices.mockReturnValue([voice('en-US', false)]);
    const onUnavailable = vi.fn(), onEnd = vi.fn();
    player.speak({ text: 'Hello' }, { onUnavailable, onEnd });
    clips[0]!.onended?.();
    expect(onUnavailable).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledOnce();
    player.speak({ text: 'Missing' }, { onUnavailable, onEnd });
    expect(synth.speak).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledTimes(2);
    expect(player.isSpeaking()).toBe(false);
  });

  it.each(['error', 'reject', 'throw'] as const)('reports unavailable once after clip %s without speech', async (failure) => {
    const { Audio, clips } = recordedSetup();
    class FailedAudio extends Audio {
      override play = (): Promise<void> => {
        if (failure === 'throw') throw Error('Unavailable');
        return failure === 'reject' ? Promise.reject(Error('Unavailable')) : Promise.resolve();
      };
    }
    const player = createVoice({ Audio: FailedAudio, synth: null, Utterance: null });
    player.setManifest({ lines: { 'bit|Hello': 'hello.mp3' }, sfx: {} });
    const onUnavailable = vi.fn(), onEnd = vi.fn();
    player.speakAll([{ text: 'Hello' }, { text: 'Missing' }], { onUnavailable, onEnd });
    const error = clips[0]!.onerror;
    if (failure === 'error') { error?.(); error?.(); }
    await Promise.resolve();
    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledOnce();
    expect(player.isSpeaking()).toBe(false);
  });

  it('plays default, selected, client, narrator and player voices', () => {
    const { player, clips, synth } = recordedSetup();
    synth.getVoices.mockImplementation(() => { throw Error('Clips need no speech voices'); });
    expect(player.supported).toBe(true);
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
    expect(synth.getVoices).not.toHaveBeenCalled();
  });

  it('keeps one fallback voice across mixed queues, sidekicks and later calls', () => {
    const { player, clips, synth, utterances } = recordedSetup();
    const chosen = voice('en-AU');
    const preferred = voice('en-US', true, 'New Natural');
    synth.getVoices.mockReturnValue([chosen]);
    player.speakAll([{ text: 'Hello' }, { text: 'One' }, { text: 'Hello' }, { text: 'Two' }]);
    expect(synth.getVoices).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
    clips[0]!.onended?.();
    expect(utterances[0]!.voice).toBe(chosen);
    synth.getVoices.mockReturnValue([preferred, chosen]);
    synth.dispatchEvent(new Event('voiceschanged'));
    utterances[0]!.onend?.();
    expect(utterances).toHaveLength(1);
    clips[1]!.onended?.();
    expect(utterances[1]!.voice).toBe(chosen);
    utterances[1]!.onend?.();
    player.speak({ text: 'Later' }, { sidekick: 'pixel' });
    expect(utterances[2]!.voice).toBe(chosen);
    utterances[2]!.onend?.();
    const other = createVoice({ synth: synth as unknown as SpeechSynthesis,
      Utterance: TestUtterance as unknown as typeof SpeechSynthesisUtterance });
    other.speak({ text: 'New session' });
    expect(utterances[3]!.voice).toBe(preferred);
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

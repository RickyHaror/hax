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

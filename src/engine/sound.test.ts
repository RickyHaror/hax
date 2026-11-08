// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSound, SOUNDS, type SoundName } from './sound';

function parameter() {
  return { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
}

function oscillator() {
  return {
    type: 'sine', frequency: parameter(), connect: vi.fn(), disconnect: vi.fn(),
    start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null,
  };
}

function gain() {
  return { gain: parameter(), connect: vi.fn(), disconnect: vi.fn() };
}

function setup(state: AudioContextState = 'running') {
  const instances: TestContext[] = [];
  class TestContext {
    readonly oscillators: ReturnType<typeof oscillator>[] = [];
    readonly gains: ReturnType<typeof gain>[] = [];
    readonly currentTime = 10;
    readonly state = state;
    readonly destination = {};
    resume = vi.fn(() => Promise.resolve());
    createOscillator = vi.fn(() => {
      const node = oscillator();
      this.oscillators.push(node);
      return node;
    });
    createGain = vi.fn(() => {
      const node = gain();
      this.gains.push(node);
      return node;
    });
    constructor() { instances.push(this); }
  }
  const deps = { AudioContext: TestContext as unknown as new () => AudioContext };
  return { instances, deps, player: createSound(deps) };
}

afterEach(() => vi.unstubAllGlobals());

describe('sound recipes', () => {
  it.each<SoundName>(['click', 'success', 'hint', 'key', 'fanfare', 'tryAgain',
    'catch', 'lock', 'unlock', 'door', 'badge', 'typing'])(
    'schedules every %s note with its envelope and connections', (name) => {
      const { player, instances } = setup();
      player.play(name);
      const context = instances[0]!;
      expect(context.oscillators).toHaveLength(SOUNDS[name].length);
      SOUNDS[name].forEach((note, index) => {
        const node = context.oscillators[index]!;
        const envelope = context.gains[index + 1]!;
        const start = context.currentTime + note.start;
        const end = start + note.duration;
        const edge = Math.min(0.01, note.duration / 3);
        expect(node.type).toBe(note.type);
        expect(node.frequency.setValueAtTime).toHaveBeenCalledWith(note.freq, start);
        expect(node.start).toHaveBeenCalledWith(start);
        expect(node.stop).toHaveBeenCalledWith(end);
        expect(node.connect).toHaveBeenCalledWith(envelope);
        expect(envelope.connect).toHaveBeenCalledWith(context.gains[0]);
        expect(context.gains[0]!.connect).toHaveBeenCalledWith(context.destination);
        expect(envelope.gain.setValueAtTime.mock.calls).toEqual([[0, start], [note.gain, end - edge]]);
        expect(envelope.gain.linearRampToValueAtTime.mock.calls)
          .toEqual([[note.gain, start + edge], [0, end]]);
        node.onended?.();
        expect(node.disconnect).toHaveBeenCalledOnce();
        expect(envelope.disconnect).toHaveBeenCalledOnce();
      });
    },
  );

  it('keeps all recipes gentle, positive in duration, and immutable', () => {
    expect(Object.keys(SOUNDS).sort()).toEqual(['badge', 'catch', 'click', 'door', 'fanfare',
      'hint', 'key', 'lock', 'success', 'tryAgain', 'typing', 'unlock']);
    expect(Object.isFrozen(SOUNDS)).toBe(true);
    for (const notes of Object.values(SOUNDS)) {
      expect(notes.length).toBeGreaterThan(0);
      expect(Object.isFrozen(notes)).toBe(true);
      for (const note of notes) {
        expect(Object.isFrozen(note)).toBe(true);
        expect(Number.isFinite(note.freq)).toBe(true);
        expect(note.freq).toBeGreaterThan(0);
        expect(note.start).toBeGreaterThanOrEqual(0);
        expect(note.duration).toBeGreaterThan(0);
        expect(note.gain).toBeGreaterThan(0);
        expect(note.gain).toBeLessThanOrEqual(0.3);
      }
    }
    expect(SOUNDS.tryAgain[0]).toMatchObject({ type: 'sine', freq: 220 });
    expect(SOUNDS.fanfare.map((note) => note.freq)).toEqual([523.25, 659.25, 783.99, 1046.5]);
    expect(Math.max(...SOUNDS.fanfare.map((note) => note.start + note.duration))).toBeLessThan(1);
  });
});

describe('sound playback', () => {
  it('scales synthesis at the output and silences already scheduled effects', () => {
    const { player, instances } = setup();
    player.setVolume(0.35); player.play('fanfare');
    const output = instances[0]!.gains[0]!;
    expect(output.gain.setValueAtTime).toHaveBeenLastCalledWith(0.35, 10);
    player.setMuted(true);
    expect(output.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 10);
    player.setVolume(0.7);
    expect(output.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 10);
    player.setMuted(false);
    expect(output.gain.setValueAtTime).toHaveBeenLastCalledWith(0.7, 10);
  });
  it('creates one lazy context, reused for later plays', () => {
    const { player, instances } = setup();
    expect(player.supported).toBe(true);
    expect(player.muted).toBe(false);
    expect(instances).toHaveLength(0);
    player.play('click');
    player.play('success');
    expect(instances).toHaveLength(1);
    expect(instances[0]!.oscillators).toHaveLength(SOUNDS.click.length + SOUNDS.success.length);
  });

  it('creates no context when muted, and resumes playback when unmuted', () => {
    const { deps, instances } = setup();
    const player = createSound(deps, { muted: true });
    player.play('click');
    expect(player.muted).toBe(true);
    expect(instances).toHaveLength(0);
    player.setMuted(false);
    player.play('click');
    player.setMuted(true);
    player.play('success');
    expect(player.muted).toBe(true);
    expect(instances).toHaveLength(1);
    expect(instances[0]!.oscillators).toHaveLength(1);
  });

  it('keeps mute and context state independent across factories', () => {
    const { deps, instances } = setup();
    const first = createSound(deps);
    const second = createSound(deps);
    first.setMuted(true);
    second.play('key');
    expect(second.muted).toBe(false);
    expect(instances).toHaveLength(1);
    first.setMuted(false);
    first.play('key');
    expect(instances).toHaveLength(2);
  });

  it('resumes a suspended context and handles promise rejection', async () => {
    const { player, instances } = setup('suspended');
    player.play('click');
    const context = instances[0]!;
    expect(context.resume).toHaveBeenCalledOnce();
    context.resume.mockRejectedValue(new Error('Gesture needed'));
    expect(() => player.play('key')).not.toThrow();
    await Promise.resolve();
    expect(context.resume).toHaveBeenCalledTimes(2);
    expect(context.oscillators).toHaveLength(2);
  });

  it.each(['AudioContext', 'webkitAudioContext'])('uses the %s browser global', (name) => {
    const { deps, instances } = setup();
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    vi.stubGlobal(name, deps.AudioContext);
    const player = createSound();
    expect(player.supported).toBe(true);
    player.play('hint');
    expect(instances).toHaveLength(1);
    expect(instances[0]!.oscillators).toHaveLength(SOUNDS.hint.length);
  });

  it('prefers the standard browser constructor', () => {
    const { deps, instances } = setup();
    const fallback = vi.fn();
    vi.stubGlobal('AudioContext', deps.AudioContext);
    vi.stubGlobal('webkitAudioContext', fallback);
    createSound().play('click');
    expect(instances).toHaveLength(1);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('safely handles missing APIs and an explicitly disabled constructor', () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    for (const player of [createSound(), createSound({ AudioContext: null })]) {
      expect(player.supported).toBe(false);
      expect(() => player.play('click')).not.toThrow();
      player.setMuted(true);
      expect(player.muted).toBe(true);
    }
    const { deps, instances } = setup();
    vi.stubGlobal('AudioContext', deps.AudioContext);
    const disabled = createSound({ AudioContext: null });
    expect(disabled.supported).toBe(false);
    disabled.play('key');
    expect(instances).toHaveLength(0);
  });

  it('catches a throwing context constructor', () => {
    const BrokenContext = class { constructor() { throw new Error('Unavailable'); } };
    const player = createSound({ AudioContext: BrokenContext as unknown as new () => AudioContext });
    expect(() => player.play('click')).not.toThrow();
  });

  it.each(['createOscillator', 'createGain', 'resume'] as const)('catches throwing %s', (method) => {
    const { player, instances } = setup('suspended');
    player.play('click');
    instances[0]![method].mockImplementation(() => { throw new Error('Unavailable'); });
    expect(() => player.play('success')).not.toThrow();
  });

  it('catches scheduling and cleanup errors', () => {
    const { player, instances } = setup();
    player.play('key');
    const context = instances[0]!;
    const node = oscillator();
    node.start.mockImplementation(() => { throw new Error('Blocked'); });
    context.createOscillator.mockReturnValue(node);
    expect(() => player.play('key')).not.toThrow();
    const ended = context.oscillators[0]!;
    ended.disconnect.mockImplementation(() => { throw new Error('Closed'); });
    expect(() => ended.onended?.()).not.toThrow();
  });
});

function recordedSound() {
  const fixture = setup();
  const clips: TestAudio[] = [];
  class TestAudio {
    volume = 1;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    play = vi.fn((): Promise<void> => Promise.resolve());
    pause = vi.fn();
    constructor(readonly src: string) { clips.push(this); }
  }
  const Audio = TestAudio as unknown as typeof globalThis.Audio;
  const player = createSound({ ...fixture.deps, Audio });
  player.setManifest({ lines: {}, sfx: { click: 'click.mp3', 'try-again': 'try-again.mp3' } });
  return { ...fixture, player, Audio, clips };
}

describe('recorded sounds', () => {
  it('updates recorded volume, clamps it, and keeps muted clips paused', () => {
    const { player, clips } = recordedSound();
    player.setVolume(0.35); player.play('click'); expect(clips[0]!.volume).toBe(0.35);
    player.setVolume(0.7); expect(clips[0]!.volume).toBe(0.7);
    player.setVolume(3); expect(clips[0]!.volume).toBe(1);
    player.setVolume(-1); expect(clips[0]!.volume).toBe(0);
    player.setVolume(NaN); expect(clips[0]!.volume).toBe(0);
    player.setMuted(true); expect(clips[0]!.pause).toHaveBeenCalled();
    player.play('click'); expect(clips).toHaveLength(1);
  });
  it('plays recorded files, mapping tryAgain to try-again, without synthesis', () => {
    const { player, clips, instances } = recordedSound();
    player.play('click'); player.play('tryAgain');
    expect(clips.map((clip) => clip.src)).toEqual(['/audio/sfx/click.mp3', '/audio/sfx/try-again.mp3']);
    for (const clip of clips) expect(clip.play).toHaveBeenCalledOnce();
    expect(instances).toHaveLength(0);
    clips[0]!.onended?.();
    expect(instances).toHaveLength(0);
  });

  it.each(['error', 'reject', 'throw'] as const)('synthesizes once on recording %s', async (failure) => {
    const { Audio, deps, clips, instances } = recordedSound();
    const Failed = class extends Audio {
      override play = (): Promise<void> => {
        if (failure === 'throw') throw Error('Blocked');
        if (failure === 'reject') return Promise.reject(Error('Blocked'));
        return Promise.resolve();
      };
    };
    const player = createSound({ ...deps, Audio: Failed });
    player.setManifest({ lines: {}, sfx: { 'try-again': 'try-again.mp3' } });
    player.play('tryAgain');
    const error = clips[0]!.onerror;
    if (failure === 'error') { error?.(); error?.(); }
    await Promise.resolve();
    expect(instances).toHaveLength(1);
    expect(instances[0]!.oscillators).toHaveLength(SOUNDS.tryAgain.length);
    expect(instances[0]!.oscillators[0]!.frequency.setValueAtTime).toHaveBeenCalledWith(220, 10);
  });

  it('uses synthesis for missing files, removed manifests and unavailable Audio', () => {
    const { player, clips, instances, deps } = recordedSound();
    player.play('badge');
    player.setManifest(null); player.play('click');
    expect(clips).toHaveLength(0);
    expect(instances[0]!.oscillators).toHaveLength(SOUNDS.badge.length + SOUNDS.click.length);
    const disabled = createSound({ ...deps, Audio: null });
    disabled.setManifest({ lines: {}, sfx: { click: 'click.mp3' } });
    disabled.play('click');
    expect(instances[1]!.oscillators).toHaveLength(SOUNDS.click.length);
  });

  it('plays recordings without WebAudio and falls back on a broken constructor', () => {
    const { Audio, clips, instances, deps } = recordedSound();
    const player = createSound({ AudioContext: null, Audio });
    expect(player.supported).toBe(true);
    player.setManifest({ lines: {}, sfx: { click: 'click.mp3' } });
    player.play('click');
    expect(clips[0]!.src).toBe('/audio/sfx/click.mp3');
    const Broken = class { constructor() { throw Error('Unavailable'); } };
    const fallback = createSound({ ...deps, Audio: Broken as unknown as typeof Audio });
    fallback.setManifest({ lines: {}, sfx: { click: 'click.mp3' } });
    fallback.play('click');
    expect(instances[0]!.oscillators).toHaveLength(SOUNDS.click.length);
  });

  it('mutes recordings and synthesis, stops clips, and suppresses delayed failures', async () => {
    const { player, clips, instances, Audio, deps } = recordedSound();
    player.setMuted(true); player.play('click'); player.play('badge');
    expect(clips).toHaveLength(0);
    expect(instances).toHaveLength(0);
    player.setMuted(false); player.play('click');
    const error = clips[0]!.onerror!;
    player.setMuted(true); error();
    expect(clips[0]!.pause).toHaveBeenCalled();
    expect(instances).toHaveLength(0);

    let reject!: (reason: Error) => void;
    const pending = new Promise<void>((_, fail) => { reject = fail; });
    const Pending = class extends Audio { override play = () => pending; };
    const other = createSound({ ...deps, Audio: Pending });
    other.setManifest({ lines: {}, sfx: { click: 'click.mp3' } });
    other.play('click'); other.setMuted(true); other.setMuted(false);
    reject(Error('Stopped'));
    await Promise.resolve();
    expect(instances).toHaveLength(0);
  });
});

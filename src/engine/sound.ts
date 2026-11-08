import type { AudioManifest } from './audio-manifest';
import { clampVolume } from './music';

export type SoundName = 'click' | 'success' | 'hint' | 'key' | 'fanfare' | 'tryAgain'
  | 'catch' | 'lock' | 'unlock' | 'door' | 'badge' | 'typing';
export interface Note {
  freq: number;
  start: number;
  duration: number;
  type: OscillatorType;
  gain: number;
}

function recipe(...notes: Note[]): readonly Note[] {
  return Object.freeze(notes.map((note) => Object.freeze(note)));
}

export const SOUNDS: Readonly<Record<SoundName, readonly Note[]>> = Object.freeze({
  click: recipe({ freq: 660, start: 0, duration: 0.06, type: 'sine', gain: 0.08 }),
  success: recipe(
    { freq: 523.25, start: 0, duration: 0.12, type: 'sine', gain: 0.16 },
    { freq: 783.99, start: 0.12, duration: 0.18, type: 'sine', gain: 0.16 },
  ),
  hint: recipe(
    { freq: 440, start: 0, duration: 0.12, type: 'sine', gain: 0.1 },
    { freq: 554.37, start: 0.12, duration: 0.14, type: 'sine', gain: 0.1 },
  ),
  key: recipe({ freq: 880, start: 0, duration: 0.04, type: 'triangle', gain: 0.04 }),
  fanfare: recipe(
    { freq: 523.25, start: 0, duration: 0.12, type: 'sine', gain: 0.18 },
    { freq: 659.25, start: 0.12, duration: 0.12, type: 'sine', gain: 0.18 },
    { freq: 783.99, start: 0.24, duration: 0.12, type: 'sine', gain: 0.18 },
    { freq: 1046.5, start: 0.36, duration: 0.24, type: 'sine', gain: 0.18 },
  ),
  tryAgain: recipe({ freq: 220, start: 0, duration: 0.2, type: 'sine', gain: 0.1 }),
  catch: recipe({ freq: 740, start: 0, duration: 0.1, type: 'sine', gain: 0.1 }),
  lock: recipe({ freq: 330, start: 0, duration: 0.08, type: 'triangle', gain: 0.08 }),
  unlock: recipe({ freq: 660, start: 0, duration: 0.1, type: 'triangle', gain: 0.08 }),
  door: recipe({ freq: 440, start: 0, duration: 0.2, type: 'sine', gain: 0.08 }),
  badge: recipe({ freq: 1046.5, start: 0, duration: 0.2, type: 'sine', gain: 0.12 }),
  typing: recipe({ freq: 800, start: 0, duration: 0.03, type: 'triangle', gain: 0.04 }),
});

export interface SoundDeps {
  AudioContext?: (new () => AudioContext) | null;
  Audio?: typeof Audio | null;
}
export interface SoundPlayer {
  readonly supported: boolean;
  readonly muted: boolean;
  setMuted(muted: boolean): void;
  setVolume?(volume: number): void;
  setManifest(m: AudioManifest | null): void;
  play(name: SoundName): void;
}

function contextConstructor(deps: SoundDeps): SoundDeps['AudioContext'] {
  try {
    const host = globalThis as typeof globalThis & { webkitAudioContext?: new () => AudioContext };
    return deps.AudioContext === undefined
      ? host.AudioContext ?? host.webkitAudioContext : deps.AudioContext;
  } catch {
    return null;
  }
}

function scheduleNote(ctx: AudioContext, note: Note, baseTime: number, output: GainNode): void {
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  const start = baseTime + note.start;
  const end = start + note.duration;
  const edge = Math.min(0.01, note.duration / 3);
  oscillator.type = note.type;
  oscillator.frequency.setValueAtTime(note.freq, start);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(note.gain, start + edge);
  envelope.gain.setValueAtTime(note.gain, end - edge);
  envelope.gain.linearRampToValueAtTime(0, end);
  oscillator.connect(envelope);
  envelope.connect(output);
  oscillator.onended = () => {
    try { oscillator.disconnect(); envelope.disconnect(); } catch { /* Already released. */ }
  };
  oscillator.start(start);
  oscillator.stop(end);
}

function audioConstructor(deps: SoundDeps): SoundDeps['Audio'] {
  try { return deps.Audio === undefined ? globalThis.Audio : deps.Audio; }
  catch { return null; }
}

function playRecording(clip: HTMLAudioElement, fallback: () => void, release: () => boolean): void {
  let settled = false;
  const settle = (failed: boolean) => {
    if (settled) return;
    settled = true;
    clip.onerror = null;
    clip.onended = null;
    try { clip.pause(); } catch { /* Already stopped. */ }
    const active = release();
    if (failed && active) fallback();
  };
  clip.onerror = () => settle(true);
  clip.onended = () => settle(false);
  try { void Promise.resolve(clip.play()).catch(() => settle(true)); }
  catch { settle(true); }
}

function stopClips(clips: Set<HTMLAudioElement>): void {
  for (const clip of clips) {
    clip.onerror = null;
    clip.onended = null;
    try { clip.pause(); } catch { /* Already stopped. */ }
  }
  clips.clear();
}

export function createSound(deps: SoundDeps = {}, opts?: { muted?: boolean }): SoundPlayer & { setVolume(volume: number): void } {
  const Context = contextConstructor(deps);
  const Audio = audioConstructor(deps);
  let context: AudioContext | undefined;
  let output: GainNode | undefined;
  let volume = 1;
  let manifest: AudioManifest | null = null;
  let muted = opts?.muted ?? false;
  const clips = new Set<HTMLAudioElement>();
  function synthesize(name: SoundName): void {
    if (muted || !Context) return;
    try {
      context ??= new Context();
      if (!output) { output = context.createGain(); output.connect(context.destination); }
      output.gain.setValueAtTime(volume, context.currentTime);
      if (context.state === 'suspended') void context.resume().catch(() => {});
      const baseTime = context.currentTime;
      for (const note of SOUNDS[name]) scheduleNote(context, note, baseTime, output);
    } catch { /* Audio may be blocked or unavailable. */ }
  }
  return {
    supported: Boolean(Context || Audio),
    get muted() { return muted; },
    setManifest(value) { manifest = value; },
    setVolume(value) {
      volume = clampVolume(value);
      if (context && output) output.gain.setValueAtTime(muted ? 0 : volume, context.currentTime);
      for (const clip of clips) clip.volume = volume;
    },
    setMuted(value) {
      muted = value;
      if (context && output) output.gain.setValueAtTime(muted ? 0 : volume, context.currentTime);
      if (muted) stopClips(clips);
    },
    play(name) {
      if (muted) return;
      const file = manifest?.sfx[name === 'tryAgain' ? 'try-again' : name];
      if (!file || !Audio) { synthesize(name); return; }
      let clip: HTMLAudioElement;
      try { clip = new Audio(`/audio/sfx/${file}`); }
      catch { synthesize(name); return; }
      clip.volume = volume;
      clips.add(clip);
      playRecording(clip, () => synthesize(name), () => clips.delete(clip));
    },
  };
}

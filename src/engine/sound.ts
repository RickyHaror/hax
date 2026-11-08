export type SoundName = 'click' | 'success' | 'hint' | 'key' | 'fanfare' | 'tryAgain';
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
});

export interface SoundDeps { AudioContext?: (new () => AudioContext) | null }
export interface SoundPlayer {
  readonly supported: boolean;
  readonly muted: boolean;
  setMuted(muted: boolean): void;
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

function scheduleNote(ctx: AudioContext, note: Note, baseTime: number): void {
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
  envelope.connect(ctx.destination);
  oscillator.onended = () => {
    try { oscillator.disconnect(); envelope.disconnect(); } catch { /* Already released. */ }
  };
  oscillator.start(start);
  oscillator.stop(end);
}

export function createSound(deps: SoundDeps = {}, opts?: { muted?: boolean }): SoundPlayer {
  const Context = contextConstructor(deps);
  let context: AudioContext | undefined;
  let muted = opts?.muted ?? false;
  return {
    supported: Boolean(Context),
    get muted() { return muted; },
    setMuted(value) { muted = value; },
    play(name) {
      if (muted || !Context) return;
      try {
        context ??= new Context();
        if (context.state === 'suspended') void context.resume().catch(() => {});
        const baseTime = context.currentTime;
        for (const note of SOUNDS[name]) scheduleNote(context, note, baseTime);
      } catch { /* Audio may be blocked or unavailable. */ }
    },
  };
}

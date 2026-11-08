import type { Settings } from './progress';
import type { SoundPlayer } from './sound';
import type { Voice } from './voice';

export type MusicTrack = 'hq' | 'terminal' | 'bootcamp' | 'playground' | 'graduation';
export interface MusicPlayer {
  readonly supported: boolean;
  play(track: MusicTrack | null): void;
  setVolume(volume: number): void;
  setEnabled(enabled: boolean): void;
  duck(on: boolean): void;
}
export interface MusicDeps { Audio?: typeof Audio | null }
export const AUDIO_GAINS = Object.freeze({ quiet: 0.35, medium: 0.7, loud: 1 });
export const MUSIC_GAINS = Object.freeze({ quiet: 0.08, medium: 0.15, loud: 0.25 });
export function clampVolume(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

export function applyAudioSettings(
  settings: Settings, voice: Voice, sound: SoundPlayer, music?: MusicPlayer,
): void {
  voice.setVolume?.(AUDIO_GAINS[settings.voices.level]);
  voice.setEnabled?.(!settings.muted && settings.voices.on);
  sound.setVolume?.(AUDIO_GAINS[settings.sounds.level]);
  sound.setMuted(settings.muted || !settings.sounds.on);
  music?.setVolume(MUSIC_GAINS[settings.music.level]);
  music?.setEnabled(!settings.muted && settings.music.on && !settings.musicLocked);
}

interface Playing {
  clip: HTMLAudioElement; playing: boolean; pending: boolean;
  timer?: ReturnType<typeof setInterval>;
}
function pause(entry: Playing): void {
  clearInterval(entry.timer);
  entry.timer = undefined;
  entry.clip.volume = 0;
  try { entry.clip.pause(); } catch { /* Already stopped. */ }
  entry.playing = false;
}
function attempt(entry: Playing): void {
  if (entry.playing || entry.pending) return;
  entry.pending = true;
  const failed = () => { entry.pending = false; entry.playing = false; };
  try {
    void Promise.resolve(entry.clip.play()).then(() => {
      entry.pending = false; entry.playing = true;
    }, failed);
  } catch { failed(); }
}
function fade(entry: Playing, target: number, done?: () => void, duration = 1000): void {
  clearInterval(entry.timer);
  const from = entry.clip.volume;
  const started = Date.now();
  entry.timer = setInterval(() => {
    const elapsed = Date.now() - started;
    entry.clip.volume = clampVolume(from + (target - from) * Math.min(1, elapsed / duration));
    if (elapsed < duration) return;
    clearInterval(entry.timer); entry.timer = undefined; done?.();
  }, 40);
}
function audioConstructor(deps: MusicDeps): MusicDeps['Audio'] {
  try { return deps.Audio === undefined ? globalThis.Audio : deps.Audio; }
  catch { return null; }
}

function trackPlayback(Audio: MusicDeps['Audio'], enabled: () => boolean, target: () => number) {
  const entries = new Set<Playing>();
  let track: MusicTrack | null = null;
  let active: Playing | undefined;
  const retire = (entry: Playing) => { pause(entry); entries.delete(entry); };
  const adjust = (duration = 1000) => { if (active) fade(active, target(), undefined, duration); };
  function start(): void {
    if (!Audio || !track || !enabled()) return;
    if (active) { attempt(active); return; }
    try {
      const clip = new Audio(`/audio/music/${track}.mp3`);
      clip.loop = true; clip.volume = 0;
      active = { clip, playing: false, pending: false };
      entries.add(active); attempt(active); adjust();
    } catch { /* Audio may be unavailable. */ }
  }
  return {
    start, adjust,
    play(next: MusicTrack | null) {
      if (next !== track) {
        if (active) {
          const previous = active;
          fade(previous, 0, () => retire(previous));
          active = undefined;
        }
        track = next;
      }
      start();
    },
    stop() { for (const entry of entries) retire(entry); active = undefined; },
    hushOutgoing() {
      for (const entry of entries) {
        if (entry !== active) fade(entry, 0, () => retire(entry), 160);
      }
    },
  };
}

export function createMusic(deps: MusicDeps = {}): MusicPlayer {
  const Audio = audioConstructor(deps);
  let volume: number = MUSIC_GAINS.quiet;
  let enabled = true;
  let ducked = false;
  const tracks = trackPlayback(Audio, () => enabled, () => volume * (ducked ? 0.02 : 1));
  const adjust = () => tracks.adjust(ducked ? 160 : 1000);
  return {
    supported: Boolean(Audio),
    play: tracks.play,
    setVolume(value) { volume = clampVolume(value); adjust(); },
    setEnabled(value) {
      if (enabled === value) return;
      enabled = value;
      if (enabled) tracks.start(); else tracks.stop();
    },
    duck(value) {
      if (ducked === value) return;
      ducked = value; adjust();
      if (ducked) tracks.hushOutgoing();
    },
  };
}

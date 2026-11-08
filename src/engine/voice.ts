import type { Line } from './types';
import { lineKey, lineRole, type AudioManifest, type VoiceContext } from './audio-manifest';

export interface VoiceDeps {
  synth?: SpeechSynthesis | null;
  Utterance?: typeof SpeechSynthesisUtterance | null;
  Audio?: typeof Audio | null;
}

export const SPEECH_RATE = 0.9;

export function pickVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  const local = english.filter((voice) => voice.localService);
  return local.find((voice) => voice.lang.toLowerCase() === 'en-us')
    ?? local.find((voice) => voice.lang.toLowerCase() === 'en-gb')
    ?? local[0] ?? null;
}

interface SpeakOptions { onEnd?: () => void; sidekick?: string }
export interface Voice {
  readonly supported: boolean;
  setManifest(m: AudioManifest | null): void;
  setContext(ctx: VoiceContext): void;
  speak(line: Line, opts?: SpeakOptions): void;
  speakAll(lines: readonly Line[], opts?: SpeakOptions): void;
  cancel(): void;
  isSpeaking(): boolean;
}

function resolveDeps(deps: VoiceDeps): VoiceDeps {
  const resolved = { ...deps };
  try { if (deps.synth === undefined) resolved.synth = globalThis.speechSynthesis; } catch { /* Unavailable. */ }
  try { if (deps.Utterance === undefined) resolved.Utterance = globalThis.SpeechSynthesisUtterance; } catch { /* Unavailable. */ }
  try { if (deps.Audio === undefined) resolved.Audio = globalThis.Audio; } catch { /* Unavailable. */ }
  return resolved;
}

function localVoice(synth: SpeechSynthesis | null | undefined): SpeechSynthesisVoice | null {
  // Read the live list so late voices and voice changes take effect.
  try { return synth ? pickVoice(synth.getVoices()) : null; } catch { return null; }
}

function speakText(
  deps: VoiceDeps, text: string, current: () => boolean, next: () => void, fail: () => void,
): void {
  const { synth, Utterance } = deps;
  const voice = localVoice(synth);
  if (!synth || !Utterance || !voice) { next(); return; }
  try {
    const utterance = new Utterance(text);
    utterance.rate = SPEECH_RATE;
    utterance.voice = voice;
    utterance.lang = voice.lang;
    let ended = false;
    const advance = () => {
      if (ended || !current()) return;
      ended = true;
      next();
    };
    utterance.onend = advance;
    utterance.onerror = advance;
    synth.speak(utterance);
  } catch { if (current()) fail(); }
}

function playClip(
  clip: HTMLAudioElement, current: () => boolean, next: () => void, fallback: () => void,
): void {
  let settled = false;
  const settle = (action: () => void) => {
    if (settled || !current()) return;
    settled = true;
    clip.onended = null;
    clip.onerror = null;
    try { clip.pause(); } catch { /* Already stopped. */ }
    action();
  };
  clip.onended = () => settle(next);
  clip.onerror = () => settle(fallback);
  try { void Promise.resolve(clip.play()).catch(() => settle(fallback)); }
  catch { settle(fallback); }
}

interface PlaybackState { revision: number; speaking: boolean; clip?: HTMLAudioElement }

function stopPlayback(state: PlaybackState, { synth, Utterance }: VoiceDeps): boolean {
  state.revision++;
  state.speaking = false;
  if (state.clip) {
    state.clip.onended = null;
    state.clip.onerror = null;
    try { state.clip.pause(); state.clip.currentTime = 0; } catch { /* Already stopped. */ }
    state.clip = undefined;
  }
  if (!synth || !Utterance) return true;
  try { synth.cancel(); return true; } catch { return false; }
}

function playLines(lines: readonly Line[], playback: {
  state: PlaybackState; deps: VoiceDeps; fileFor: (line: Line) => string | undefined;
  current: () => boolean; finish: () => void;
}): void {
  const { state, deps, current, finish, fileFor } = playback;
  let index = 0;
  function next(): void {
    if (!current()) return;
    state.clip = undefined;
    const line = lines[index++];
    if (!line) { finish(); return; }
    const fallback = () => speakText(deps, line.say ?? line.text, current, next, finish);
    const file = fileFor(line);
    if (!file || !deps.Audio) { fallback(); return; }
    try { state.clip = new deps.Audio(`/audio/lines/${file}`); }
    catch { fallback(); return; }
    playClip(state.clip, current, next, fallback);
  }
  next();
}

export function createVoice(deps: VoiceDeps = {}): Voice {
  const resolved = resolveDeps(deps);
  const { synth, Utterance, Audio } = resolved;
  let manifest: AudioManifest | null = null;
  let context: VoiceContext = { sidekick: 'bit' };
  const state: PlaybackState = { revision: 0, speaking: false };
  const stop = () => stopPlayback(state, resolved);

  function speakAll(lines: readonly Line[], opts?: SpeakOptions): void {
    const stopped = stop();
    const token = state.revision;
    const current = () => state.revision === token;
    const ctx = { ...context, sidekick: opts?.sidekick ?? context.sidekick };
    const queue = lines.filter((line) => (line.say ?? line.text).trim());
    const finish = () => {
      if (!current()) return;
      state.revision++;
      state.speaking = false;
      state.clip = undefined;
      opts?.onEnd?.();
    };
    if (!stopped) { finish(); return; }
    state.speaking = true;
    playLines(queue, { state, deps: resolved, current, finish,
      fileFor: (line) => manifest?.lines[lineKey(line, lineRole(line, ctx))] });
  }

  return {
    get supported() {
      return Boolean(Audio && manifest && Object.keys(manifest.lines).length)
        || Boolean(synth && Utterance && localVoice(synth));
    },
    setManifest: (value) => { manifest = value; },
    setContext: (value) => { context = { ...value }; },
    cancel: () => { stop(); }, speakAll,
    speak: (line, opts) => speakAll([line], opts),
    isSpeaking: () => state.speaking,
  };
}

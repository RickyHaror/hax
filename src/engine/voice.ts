import type { Line } from './types';
import { clampVolume } from './music';
import { lineKey, lineRole, type AudioManifest, type VoiceContext } from './audio-manifest';

export interface VoiceDeps {
  synth?: SpeechSynthesis | null;
  Utterance?: typeof SpeechSynthesisUtterance | null;
  Audio?: typeof Audio | null;
}

export const SPEECH_RATE = 0.9;

export function pickVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((voice) => voice.localService && /^en(?:-|$)/i.test(voice.lang));
  const rank = (voice: SpeechSynthesisVoice) => [
    voice.localService ? 0 : 1,
    /^en-(us|ca)$/i.test(voice.lang) ? 0 : 1,
    voice.localService && /natural/i.test(voice.name) ? 0 : 1,
  ];
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  return english.sort((a, b) => {
    const left = rank(a), right = rank(b);
    return left[0]! - right[0]! || left[1]! - right[1]! || left[2]! - right[2]!
      || compare(a.name, b.name) || compare(a.lang, b.lang) || compare(a.voiceURI, b.voiceURI);
  })[0] ?? null;
}

interface SpeakOptions { onEnd?: () => void; onUnavailable?: () => void; sidekick?: string }
export interface Voice {
  readonly supported: boolean;
  setManifest(m: AudioManifest | null): void;
  setContext(ctx: VoiceContext): void;
  speak(line: Line, opts?: SpeakOptions): void;
  speakParts?(whole: Line, parts: readonly Line[], opts?: SpeakOptions): void;
  speakAll(lines: readonly Line[], opts?: SpeakOptions): void;
  cancel(): void;
  isSpeaking(): boolean;
  setVolume?(volume: number): void;
  setEnabled?(enabled: boolean): void;
  onSpeakingChange?(listener: (speaking: boolean) => void): () => void;
}

function resolveDeps(deps: VoiceDeps): VoiceDeps {
  const resolved = { ...deps };
  try { if (deps.synth === undefined) resolved.synth = globalThis.speechSynthesis; } catch { /* Unavailable. */ }
  try { if (deps.Utterance === undefined) resolved.Utterance = globalThis.SpeechSynthesisUtterance; } catch { /* Unavailable. */ }
  try { if (deps.Audio === undefined) resolved.Audio = globalThis.Audio; } catch { /* Unavailable. */ }
  return resolved;
}

function readVoices(synth: SpeechSynthesis): SpeechSynthesisVoice[] | null {
  try { return synth.getVoices(); } catch { return null; }
}

function waitForVoices(synth: SpeechSynthesis, ready: (voices: SpeechSynthesisVoice[]) => void): () => void {
  let settled = false;
  const cleanup = () => {
    settled = true;
    clearTimeout(timer);
    synth.removeEventListener('voiceschanged', changed);
  };
  const finish = (voices: SpeechSynthesisVoice[]) => {
    if (settled) return;
    cleanup();
    ready(voices);
  };
  const changed = () => {
    const voices = readVoices(synth);
    if (voices?.length) finish(voices);
  };
  const timer = setTimeout(() => finish(readVoices(synth) ?? []), 1500);
  synth.addEventListener('voiceschanged', changed);
  return cleanup;
}

function createVoiceSelection(synth: VoiceDeps['synth']) {
  let cached: SpeechSynthesisVoice | null = null;
  let picked = false;
  let cancelWait = () => {};
  const select = (voices: SpeechSynthesisVoice[]) => {
    picked = true;
    const present = cached && voices.some((voice) => voice.voiceURI === cached!.voiceURI
      && voice.name === cached!.name && voice.lang === cached!.lang
      && voice.localService === cached!.localService);
    if (!present) cached = pickVoice(voices);
    return cached;
  };
  return {
    cancel: () => { cancelWait(); cancelWait = () => {}; },
    get(ready: (voice: SpeechSynthesisVoice | null) => void) {
      if (!synth) { ready(null); return; }
      const voices = readVoices(synth);
      if (!voices) { ready(null); return; }
      if (voices.length || picked) { ready(select(voices)); return; }
      cancelWait = waitForVoices(synth, (loaded) => ready(select(loaded)));
    },
  };
}

function speakText(
  deps: VoiceDeps, voice: SpeechSynthesisVoice | null, text: string,
  current: () => boolean, next: (played?: boolean) => void, fail: () => void,
  state: PlaybackState,
): void {
  const { synth, Utterance } = deps;
  if (!synth || !Utterance || !voice) { next(); return; }
  try {
    const utterance = new Utterance(text);
    utterance.rate = SPEECH_RATE;
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.volume = state.volume;
    state.utterance = utterance;
    let ended = false;
    const advance = (played: boolean) => {
      if (ended || !current()) return;
      ended = true;
      next(played);
    };
    utterance.onend = () => advance(true);
    utterance.onerror = () => advance(false);
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

interface PlaybackState {
  revision: number; speaking: boolean; volume: number;
  clip?: HTMLAudioElement; utterance?: SpeechSynthesisUtterance;
}

function stopPlayback(state: PlaybackState, { synth, Utterance }: VoiceDeps): boolean {
  state.revision++;
  state.speaking = false;
  state.utterance = undefined;
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
  selection: ReturnType<typeof createVoiceSelection>;
  current: () => boolean; finish: (played?: boolean) => void;
}): void {
  const { state, deps, current, finish, fileFor, selection } = playback;
  let index = 0;
  let heard = false;
  function next(played = false): void {
    if (!current()) return;
    heard ||= played;
    state.clip = undefined;
    const line = lines[index++];
    if (!line) { finish(heard); return; }
    const fallback = () => {
      if (!deps.synth || !deps.Utterance) { next(); return; }
      selection.get((voice) => {
        if (current()) speakText(deps, voice, line.say ?? line.text, current, next, () => finish(heard), state);
      });
    };
    const file = fileFor(line);
    if (!file || !deps.Audio) { fallback(); return; }
    try { state.clip = new deps.Audio(`/audio/lines/${file}`); }
    catch { fallback(); return; }
    state.clip.volume = state.volume;
    playClip(state.clip, current, () => next(true), fallback);
  }
  next();
}

type VoiceControls = Required<Pick<Voice, 'setVolume' | 'setEnabled' | 'onSpeakingChange'>>;
function voiceControls(state: PlaybackState, cancel: () => boolean) {
  let enabled = true;
  const listeners = new Set<(speaking: boolean) => void>();
  const notify = () => { for (const listener of listeners) listener(state.speaking); };
  const stop = () => {
    const wasSpeaking = state.speaking;
    const stopped = cancel();
    if (wasSpeaking) notify();
    return stopped;
  };
  const player: VoiceControls = {
    setVolume(value) {
      state.volume = clampVolume(value);
      if (state.clip) state.clip.volume = state.volume;
      if (state.utterance) state.utterance.volume = state.volume;
    },
    setEnabled(value) { if (enabled === value) return; enabled = value; if (!enabled) stop(); },
    onSpeakingChange(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
  return { get enabled() { return enabled; }, stop, notify, player };
}

export function createVoice(deps: VoiceDeps = {}): Voice & VoiceControls & Required<Pick<Voice, 'speakParts'>> {
  const resolved = resolveDeps(deps);
  const { synth, Utterance, Audio } = resolved;
  let manifest: AudioManifest | null = null;
  let context: VoiceContext = { sidekick: 'bit' };
  const state: PlaybackState = { revision: 0, speaking: false, volume: 1 };
  const selection = createVoiceSelection(synth);
  const controls = voiceControls(state, () => { selection.cancel(); return stopPlayback(state, resolved); });
  const { stop, notify } = controls;

  function speakAll(lines: readonly Line[], opts?: SpeakOptions): void {
    const stopped = stop();
    const token = state.revision;
    const current = () => state.revision === token;
    const ctx = { ...context, sidekick: opts?.sidekick ?? context.sidekick };
    const queue = lines.filter((line) => (line.say ?? line.text).trim());
    const finish = (played = false) => {
      if (!current()) return;
      state.revision++;
      state.speaking = false;
      state.clip = undefined;
      state.utterance = undefined;
      notify();
      if (!played) opts?.onUnavailable?.();
      opts?.onEnd?.();
    };
    if (!controls.enabled) { opts?.onEnd?.(); return; }
    if (!stopped) { finish(); return; }
    state.speaking = true;
    notify();
    playLines(queue, { state, deps: resolved, selection, current, finish,
      fileFor: (line) => manifest?.lines[lineKey(line, lineRole(line, ctx))] });
  }

  return {
    get supported() {
      return Boolean(Audio && manifest && Object.keys(manifest.lines).length)
        || Boolean(synth && Utterance && pickVoice(readVoices(synth) ?? []));
    },
    setManifest: (value) => { manifest = value; },
    setContext: (value) => { context = { ...value }; },
    ...controls.player,
    cancel: () => { stop(); }, speakAll,
    speak: (line, opts) => speakAll([line], opts),
    speakParts(whole, parts, opts) {
      const ctx = { ...context, sidekick: opts?.sidekick ?? context.sidekick };
      const recorded = manifest && Audio && parts.length > 0
        && parts.every((line) => manifest!.lines[lineKey(line, lineRole(line, ctx))]);
      speakAll(recorded ? parts : [whole], opts);
    },
    isSpeaking: () => state.speaking,
  };
}

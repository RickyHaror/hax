import type { Line } from './types';

export interface VoiceDeps {
  synth?: SpeechSynthesis | null;
  Utterance?: typeof SpeechSynthesisUtterance | null;
}

export const SPEECH_RATE = 0.9;

export function pickVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  const local = english.filter((voice) => voice.localService);
  return local.find((voice) => voice.lang.toLowerCase() === 'en-us')
    ?? local.find((voice) => voice.lang.toLowerCase() === 'en-gb')
    ?? local[0] ?? english[0] ?? null;
}

export interface Voice {
  readonly supported: boolean;
  speak(line: Line, opts?: { onEnd?: () => void }): void;
  speakAll(lines: readonly Line[], opts?: { onEnd?: () => void }): void;
  cancel(): void;
  isSpeaking(): boolean;
}

function resolveDeps(deps: VoiceDeps): VoiceDeps {
  try {
    return {
      synth: deps.synth === undefined ? globalThis.speechSynthesis : deps.synth,
      Utterance: deps.Utterance === undefined ? globalThis.SpeechSynthesisUtterance : deps.Utterance,
    };
  } catch {
    return {};
  }
}

function playLines(
  synth: SpeechSynthesis, Utterance: typeof SpeechSynthesisUtterance,
  texts: readonly string[], current: () => boolean, finish: () => void,
): void {
  let index = 0;
  function next(): void {
    if (!current()) return;
    const text = texts[index++];
    if (text === undefined) { finish(); return; }
    let failed = false;
    try {
      const utterance = new Utterance(text);
      const voice = pickVoice(synth.getVoices());
      utterance.rate = SPEECH_RATE;
      utterance.voice = voice;
      utterance.lang = voice?.lang || 'en-US';
      let ended = false;
      const advance = () => {
        if (ended || !current()) return;
        ended = true;
        next();
      };
      utterance.onend = advance;
      utterance.onerror = advance;
      synth.speak(utterance);
    } catch {
      failed = true;
    }
    if (failed && current()) finish();
  }
  next();
}

export function createVoice(deps: VoiceDeps = {}): Voice {
  const { synth, Utterance } = resolveDeps(deps);
  const supported = Boolean(synth && Utterance);
  let revision = 0;
  let speaking = false;

  function stop(): boolean {
    revision++;
    speaking = false;
    if (!supported) return true;
    try { synth?.cancel(); return true; } catch { return false; }
  }

  function speakAll(lines: readonly Line[], opts?: { onEnd?: () => void }): void {
    const stopped = stop();
    const token = revision;
    const finish = () => {
      if (revision !== token) return;
      revision++;
      speaking = false;
      opts?.onEnd?.();
    };
    const texts = lines.map((line) => line.say ?? line.text).filter((text) => text.trim());
    if (!stopped || !synth || !Utterance || texts.length === 0) { finish(); return; }
    speaking = true;
    playLines(synth, Utterance, texts, () => revision === token, finish);
  }

  return {
    supported, cancel: () => { stop(); }, speakAll,
    speak: (line, opts) => speakAll([line], opts),
    isSpeaking: () => speaking,
  };
}

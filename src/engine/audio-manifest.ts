import type { Line } from './types';

export interface AudioManifest {
  lines: Readonly<Record<string, string>>;
  sfx: Readonly<Record<string, string>>;
}
export interface VoiceContext { sidekick: string; missionId?: string | null }

function record(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

function files(data: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(data).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string'
      && /^[A-Za-z0-9._-]+\.mp3$/.test(entry[1]),
  ));
}

export function parseAudioManifest(data: unknown): AudioManifest | null {
  if (!record(data) || !record(data.lines) || !record(data.sfx)) return null;
  return { lines: files(data.lines), sfx: files(data.sfx) };
}

export async function loadAudioManifest(fetchFn?: typeof fetch): Promise<AudioManifest | null> {
  try {
    const response = await (fetchFn ?? globalThis.fetch)('/audio/manifest.json');
    return response.ok ? parseAudioManifest(await response.json()) : null;
  } catch { return null; }
}

export function lineKey(line: Line, role: string): string {
  return `${role}|${(line.say ?? line.text).trim()}`;
}

export function lineRole(line: Line, ctx: VoiceContext): string {
  if (line.speaker === undefined || line.speaker === 'sidekick') return ctx.sidekick;
  return line.speaker === 'client' ? `client:${ctx.missionId}` : 'narrator';
}

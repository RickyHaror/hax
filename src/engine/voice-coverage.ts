import { createHash } from 'node:crypto';
import type { AudioManifest } from './audio-manifest';
import type { Line } from './types';

export interface VoiceCast {
  model: string;
  settings: Readonly<Record<string, unknown>>;
  narrator: string;
  sidekicks: Readonly<Record<string, string>>;
  clients: Readonly<Record<string, string>> & { default: string };
}

export interface VoiceContent {
  missions: readonly { id: string }[];
  sidekicks: readonly { id: string }[];
  playground?: {
    intro: readonly Line[];
    eggs: readonly { found: readonly Line[] }[];
  } | null;
  signup?: readonly { role: string; spoken: string }[];
  catalog?: readonly Line[];
}

export interface VoiceJob { role: string; voice: string; spoken: string }

/** Mirror linesIn in scripts/audio/generate.mjs, including its exact object shape. */
function linesIn(value: unknown, out: Line[] = []): Line[] {
  if (Array.isArray(value)) value.forEach((item) => linesIn(item, out));
  else if (value && typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string'
      && Object.keys(value).every((key) => ['text', 'say', 'speaker'].includes(key))) {
      out.push(value as Line);
    } else Object.values(value).forEach((item) => linesIn(item, out));
  }
  return out;
}

/** Mirror buildJobs in the generator, excluding retired missions from release coverage. */
export function buildVoiceJobs(content: VoiceContent, cast: VoiceCast): VoiceJob[] {
  const jobs = new Map<string, VoiceJob>();
  const add = (role: string, voice: string, spoken: string) => {
    const key = `${role}|${spoken}`;
    if (!jobs.has(key)) jobs.set(key, { role, voice, spoken });
  };
  const buddies = Object.entries(cast.sidekicks);
  for (const mission of content.missions) {
    if ('retired' in mission && mission.retired === true) continue;
    const clientVoice = cast.clients[mission.id] ?? cast.clients.default;
    for (const line of linesIn(mission)) {
      const spoken = (line.say ?? line.text).trim();
      if (!spoken) continue;
      const speaker = line.speaker ?? 'sidekick';
      if (speaker === 'client') add(`client:${mission.id}`, clientVoice, spoken);
      else if (speaker === 'sidekick') for (const [id, voice] of buddies) add(id, voice, spoken);
      else add('narrator', cast.narrator, spoken);
    }
  }
  if (content.playground) {
    const lines = [...content.playground.intro, ...content.playground.eggs.flatMap((egg) => egg.found)];
    for (const line of lines) {
      for (const [id, voice] of buddies) add(id, voice, (line.say ?? line.text).trim());
    }
  }
  for (const buddy of content.sidekicks) {
    const voice = cast.sidekicks[buddy.id];
    if (!voice) continue;
    for (const line of linesIn(buddy)) add(buddy.id, voice, (line.say ?? line.text).trim());
  }
  for (const { role, spoken } of content.signup ?? []) add(role, cast.narrator, spoken);
  for (const line of content.catalog ?? []) {
    const spoken = (line.say ?? line.text).trim();
    if (!spoken) continue;
    if (!line.speaker || line.speaker === 'sidekick') {
      for (const [id, voice] of buddies) add(id, voice, spoken);
    } else add('narrator', cast.narrator, spoken);
  }
  return [...jobs.values()];
}

export function voiceFileFor(job: VoiceJob, cast: VoiceCast): string {
  const input = `${job.voice}|${cast.model}|${JSON.stringify(cast.settings)}|${job.spoken}`;
  return createHash('sha1').update(input).digest('hex').slice(0, 16) + '.mp3';
}

/** One diagnostic per key, even if both its manifest entry and file are missing. */
export function voiceCoverageIssues(
  jobs: readonly VoiceJob[], cast: VoiceCast,
  manifest: Pick<AudioManifest, 'lines'>, files: ReadonlySet<string>,
): string[] {
  const issues = new Map<string, string>();
  for (const job of jobs) {
    const key = `${job.role}|${job.spoken}`;
    const expected = voiceFileFor(job, cast);
    const actual = manifest.lines[key];
    const reasons: string[] = [];
    if (!actual) reasons.push('missing manifest entry');
    else if (actual !== expected) reasons.push(`stale clip: ${actual}, expected ${expected}`);
    if (!files.has(expected)) reasons.push(`missing mp3: ${expected}`);
    if (reasons.length) issues.set(key, `${key}: ${reasons.join('; ')}`);
  }
  return [...issues.values()];
}

export function formatVoiceCoverageIssues(issues: readonly string[]): string {
  return [...issues.slice(0, 40), ...(issues.length > 40 ? [`... ${issues.length - 40} more keys`] : []),
    `${issues.length} missing or stale keys`].join('\n');
}

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { lineKey } from './audio-manifest';
import {
  buildVoiceJobs, formatVoiceCoverageIssues, voiceCoverageIssues, voiceFileFor,
  type VoiceCast, type VoiceContent, type VoiceJob,
} from './voice-coverage';

const cast: VoiceCast = {
  model: 'model', settings: { stability: 0.5, speed: 0.92 }, narrator: 'narrator-voice',
  sidekicks: { bit: 'bit-voice', pixel: 'pixel-voice', hoot: 'hoot-voice' },
  clients: { pizza: 'pizza-voice', default: 'default-voice' },
};
const job = (role: string, voice: string, spoken: string): VoiceJob => ({ role, voice, spoken });
const buddies = (spoken: string) => Object.entries(cast.sidekicks).map(([id, voice]) => job(id, voice, spoken));
const empty: VoiceContent = { missions: [], sidekicks: [] };

describe('generator job mirror', () => {
  it('pins traversal, roles, overrides, trimming, deduplication and generator ordering', () => {
    const content = {
      missions: [
        { id: 'pizza', title: 'Not a Line', nested: [
          { text: '  Hi  ' }, { text: 'Hi', speaker: 'sidekick' },
          { text: 'ls', say: '  L S  ', speaker: 'client' },
          { text: 'Read', speaker: 'narrator' }, { text: 'Me', speaker: 'player' },
          { text: 'Silent', say: '' }, { text: 'Also silent', say: '  ' }, { text: '  ' },
          { text: 'Not a Line either', extra: true, nested: { text: 'Inside' } },
        ] },
        { id: 'other', intro: [{ text: 'Help', speaker: 'client' }] },
      ],
      playground: { intro: [{ text: 'Play', speaker: 'narrator' }],
        eggs: [{ found: [{ text: 'egg', say: '  An egg  ', speaker: 'client' }] }],
        commands: [{ output: ['Not voiced'] }], fs: { text: 'Also not voiced' } },
      sidekicks: [{ id: 'bit', greeting: [{ text: 'Beep', speaker: 'narrator' }] },
        { id: 'unknown', greeting: [{ text: 'Skip me' }] }],
      signup: [{ role: 'narrator', spoken: 'Name' }, { role: 'narrator', spoken: 'Name' }],
    } as const;
    const jobs = buildVoiceJobs(content, cast);
    expect(jobs).toEqual([
      ...buddies('Hi'), job('client:pizza', 'pizza-voice', 'L S'),
      job('narrator', 'narrator-voice', 'Read'), job('narrator', 'narrator-voice', 'Me'),
      ...buddies('Inside'), job('client:other', 'default-voice', 'Help'),
      ...buddies('Play'), ...buddies('An egg'), job('bit', 'bit-voice', 'Beep'),
      job('narrator', 'narrator-voice', 'Name'),
    ]);
    expect(jobs.map(({ role, spoken }) => lineKey({ text: spoken }, role)))
      .toContain('client:pizza|L S');
  });

  it('skips only missions whose runtime retired field is true', () => {
    const missions = [
      { id: 'gone', retired: true, intro: [{ text: 'Gone' }] },
      { id: 'live', retired: false, intro: [{ text: 'Live' }] },
      { id: 'absent', intro: [{ text: 'Absent' }] },
      { id: 'truthy', retired: 'true', intro: [{ text: 'Truthy' }] },
    ];
    expect(buildVoiceJobs({ ...empty, missions }, cast))
      .toEqual([...buddies('Live'), ...buddies('Absent'), ...buddies('Truthy')]);
  });

  it('preserves the generator handling of empty playground and sidekick lines', () => {
    const content = { ...empty, playground: { intro: [{ text: 'Silent', say: '' }], eggs: [] },
      sidekicks: [{ id: 'bit', greeting: [{ text: 'Silent', say: '' }] }] };
    expect(buildVoiceJobs(content, cast)).toEqual(buddies(''));
  });

  it('accepts absent optional content and an empty cast', () => {
    expect(buildVoiceJobs(empty, cast)).toEqual([]);
    expect(buildVoiceJobs({ ...empty, playground: null }, { ...cast, sidekicks: {} })).toEqual([]);
  });
});

describe('recorded clip coverage', () => {
  const recording = job('narrator', 'narrator-voice', 'Hello');
  const key = 'narrator|Hello';
  // Independent SHA1 fixture for narrator-voice|model|{"stability":0.5,"speed":0.92}|Hello.
  const filename = '973126c195270acf.mp3';
  const manifest = { lines: { [key]: filename } };

  it('matches the generator hash and accepts a matching manifest and file', () => {
    expect(voiceFileFor(recording, cast)).toBe(filename);
    expect(voiceCoverageIssues([recording], cast, manifest, new Set([filename]))).toEqual([]);
  });

  it.each([
    ['text', { ...recording, spoken: 'Hello!' }, cast],
    ['voice', { ...recording, voice: 'new-voice' }, cast],
    ['model', recording, { ...cast, model: 'new-model' }],
    ['settings', recording, { ...cast, settings: { ...cast.settings, speed: 1 } }],
  ] as const)('detects stale %s even when the old mp3 exists', (_label, changed, changedCast) => {
    const changedKey = `${changed.role}|${changed.spoken}`;
    const stale = { lines: { [changedKey]: filename } };
    expect(voiceCoverageIssues([changed], changedCast, stale, new Set([filename])))
      .toEqual([expect.stringContaining(`${changedKey}: stale clip:`)]);
  });

  it('detects missing keys and missing files independently, without early exit', () => {
    const second = job('bit', 'bit-voice', 'Hi');
    const files = new Set([voiceFileFor(second, cast)]);
    const issues = voiceCoverageIssues([recording, second], cast, manifest, files);
    expect(issues).toEqual([
      `${key}: missing mp3: ${filename}`, 'bit|Hi: missing manifest entry',
    ]);
    expect(voiceCoverageIssues([recording], cast, { lines: {} }, new Set()))
      .toEqual([`${key}: missing manifest entry; missing mp3: ${filename}`]);
  });

  it('lists at most forty bad keys and reports the remaining and total counts', () => {
    const issues = Array.from({ length: 43 }, (_, index) => `bit|Line ${index}: missing manifest entry`);
    expect(formatVoiceCoverageIssues(issues).split('\n'))
      .toEqual([...issues.slice(0, 40), '... 3 more keys', '43 missing or stale keys']);
    expect(formatVoiceCoverageIssues(issues.slice(0, 1)))
      .toBe(`${issues[0]}\n1 missing or stale keys`);
  });
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildVoiceJobs, type VoiceCast } from '../engine/voice-coverage';
import { createProgress, toSaveCode } from '../engine/progress';
import { caesarDecode } from '../engine/cipher';
import { missions } from '../missions';
import {
  agentNameSpeech, catalogEntries, isCatalogSpeech, keyPromptLine, saveKeySpeech, screenLines, speechCatalog,
} from './speech-catalog';

const cast: VoiceCast = { model: 'test', settings: {}, narrator: 'narrator-voice',
  sidekicks: { bit: 'bit-voice', pixel: 'pixel-voice', hoot: 'hoot-voice' }, clients: { default: 'client-voice' } };

describe('screen speech catalog', () => {
  it('lists unique stable keys and nonempty Line objects', () => {
    const entries = catalogEntries();
    expect(new Set(entries.map(({ key }) => key)).size).toBe(entries.length);
    for (const { key, line } of entries) {
      expect(key).toContain('.');
      expect((line.say ?? line.text).trim()).not.toBe('');
      expect(Object.keys(line).every((key) => ['text', 'say', 'speaker'].includes(key))).toBe(true);
    }
  });

  it('records screen lines in the voices used by the UI, with say overrides and deduplication', () => {
    const catalog = [speechCatalog.boot.toolsReady, speechCatalog.boot.toolsReady, speechCatalog.signup.prefix];
    const jobs = buildVoiceJobs({ missions: [], sidekicks: [], catalog }, cast);
    expect(jobs).toEqual([
      { role: 'bit', voice: 'bit-voice', spoken: 'Crew tools are ready.' },
      { role: 'pixel', voice: 'pixel-voice', spoken: 'Crew tools are ready.' },
      { role: 'hoot', voice: 'hoot-voice', spoken: 'Crew tools are ready.' },
      { role: 'narrator', voice: 'narrator-voice', spoken: 'Your name is' },
    ]);
  });

  it('includes bounded prompts and screen values without recording every name', () => {
    const spoken = new Set(catalogEntries().map(({ line }) => line.say ?? line.text));
    for (const line of [keyPromptLine('a'), keyPromptLine('3'), keyPromptLine('Enter'),
      screenLines.caught(3, 10), screenLines.wordsLeft(1), screenLines.shift(25),
      screenLines.rankScore(60, 200), screenLines.earnedXp(20)]) {
      expect(spoken.has(line.say ?? line.text), line.text).toBe(true);
    }
    expect(spoken.has('Your name: Turbo Falcon')).toBe(false);
    expect(spoken.has('Turbo Falcon')).toBe(false);
    for (const config of missions.filter((mission) => !mission.retired).flatMap((mission) => mission.steps.map((step) => step.config))) {
      if (config.kind !== 'decoder') continue;
      for (let shift = 0; shift < 26; shift++) expect(spoken.has(caesarDecode(config.message, shift))).toBe(true);
    }
  });

  it('composes name and save key clips without changing their visible text', () => {
    expect(agentNameSpeech('Turbo', 'Falcon', true)).toEqual({
      line: { text: 'Your name: Turbo Falcon', speaker: 'narrator' },
      parts: [speechCatalog.signup.prefix, { text: 'Turbo', speaker: 'narrator' },
        { text: 'Falcon', speaker: 'narrator' }],
    });
    expect(agentNameSpeech('Turbo', 'Falcon').line.text).toBe('Turbo Falcon');
    const key = saveKeySpeech(toSaveCode(createProgress(), missions));
    expect(key.parts.map((part) => part.text).join('')).toBe(key.line.text);
    expect(key.line.say).toBe(key.line.text.split('').join(' '));
    expect(isCatalogSpeech(key.line)).toBe(true);
    expect(isCatalogSpeech(agentNameSpeech('Turbo', 'Falcon', true).line)).toBe(true);
    expect(isCatalogSpeech(agentNameSpeech('Turbo', 'Falcon').line)).toBe(true);
    expect(isCatalogSpeech({ text: 'User typed output' })).toBe(false);
  });
});

// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lineKey, lineRole, loadAudioManifest, parseAudioManifest } from './audio-manifest';
import type { Line } from './types';

afterEach(() => vi.unstubAllGlobals());

describe('audio manifest', () => {
  it.each([null, undefined, [], 1, 'bad', {}, { lines: [], sfx: {} },
    { lines: {}, sfx: null }, { lines: 'bad', sfx: {} }])('rejects invalid shape %j', (data) => {
    expect(parseAudioManifest(data)).toBeNull();
  });

  it('keeps only safe mp3 file names and ignores extra fields', () => {
    const unsafe = ['../bad.mp3', '/bad.mp3', 'dir/bad.mp3', 'dir\bad.mp3',
      'bad.wav', 'bad.mp3?x', 'bad.mp3#x', 'bad file.mp3', '', 1, null, {}];
    const entries = Object.fromEntries(unsafe.map((value, i) => [`bad${i}`, value]));
    const valid = { one: 'a-1_2.3.mp3', two: 'try-again.mp3' };
    expect(parseAudioManifest({ version: 1, lines: { ...entries, ...valid },
      sfx: { ...entries, ...valid }, music: {} })).toEqual({ lines: valid, sfx: valid });
    expect(parseAudioManifest({ lines: {}, sfx: {} })).toEqual({ lines: {}, sfx: {} });
  });

  it('fetches exactly the relative manifest path with injected or global fetch', async () => {
    const data = { lines: { 'bit|Hi': 'hi.mp3' }, sfx: {} };
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue({ ok: true,
      json: async () => data } as Response);
    expect(await loadAudioManifest(fetchFn)).toEqual(data);
    expect(fetchFn.mock.calls).toEqual([['/audio/manifest.json']]);
    vi.stubGlobal('fetch', fetchFn);
    expect(await loadAudioManifest()).toEqual(data);
  });

  it('returns null on unavailable fetch, rejection, non-ok, bad JSON or shape', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    fetchFn.mockRejectedValueOnce(new Error('Offline'));
    expect(await loadAudioManifest(fetchFn)).toBeNull();
    const json = vi.fn();
    fetchFn.mockResolvedValueOnce({ ok: false, json } as unknown as Response);
    expect(await loadAudioManifest(fetchFn)).toBeNull();
    expect(json).not.toHaveBeenCalled();
    fetchFn.mockResolvedValueOnce({ ok: true, json: async () => { throw Error('Bad JSON'); } } as unknown as Response);
    expect(await loadAudioManifest(fetchFn)).toBeNull();
    fetchFn.mockResolvedValueOnce({ ok: true, json: async () => [] } as unknown as Response);
    expect(await loadAudioManifest(fetchFn)).toBeNull();
    vi.stubGlobal('fetch', undefined);
    expect(await loadAudioManifest()).toBeNull();
  });
});

describe('line identity', () => {
  it('uses trimmed say before text, including an empty say', () => {
    expect(lineKey({ text: '  Hello  ' }, 'bit')).toBe('bit|Hello');
    expect(lineKey({ text: 'ls', say: '  L S  ' }, 'pixel')).toBe('pixel|L S');
    expect(lineKey({ text: 'hidden', say: '' }, 'hoot')).toBe('hoot|');
  });

  it.each<[Line['speaker'], string]>([
    [undefined, 'pixel'], ['sidekick', 'pixel'], ['client', 'client:pizza'],
    ['narrator', 'narrator'], ['player', 'narrator'],
  ])('maps speaker %s to %s', (speaker, expected) => {
    expect(lineRole({ text: 'Hi', speaker }, { sidekick: 'pixel', missionId: 'pizza' })).toBe(expected);
  });
});

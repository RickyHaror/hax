import { describe, expect, it } from 'vitest';
import { buildRegistry, readSeasons } from './registry';
import type { Season } from '../engine/types';
import { client, dependent, login } from './test/fixtures';
import { playground } from '../missions/playground';
describe('content registry', () => {
  const season: Season = { id: 's1', number: 1, title: 'Town', blurb: 'Help our town.', missions: ['one'], requires: null };
  it('accepts absent, empty and filled season sources without changing the input', () => {
    expect(readSeasons(undefined)).toEqual([]);
    expect(readSeasons({})).toEqual([]);
    expect(buildRegistry({ seasons: [] }).seasons).toEqual([]);
    const seasons = [{ ...season, id: 's2', number: 2, requires: 's1' }, season];
    expect(buildRegistry({ seasons }).seasons.map((entry) => entry.id)).toEqual(['s1', 's2']);
    expect(seasons[0]!.id).toBe('s2');
  });
  it('drops malformed season entries while preserving valid entries', () => {
    const malformed = [null, 1, [], {}, { ...season, id: '' }, { ...season, number: 1.5 },
      { ...season, number: '1' }, { ...season, title: null }, { ...season, blurb: false },
      { ...season, missions: ['one', 2] }, { ...season, requires: undefined }];
    expect(readSeasons([...malformed, season])).toEqual([season]);
  });
  it('uses playground content and accepts null or a replacement', () => {
    expect(buildRegistry().playground).toBe(playground);
    expect(buildRegistry({ playground: null }).playground).toBeNull();
    if (!playground) throw new Error('Playground content is required for this test.');
    const replacement = { ...playground, unlockedBy: 'other' };
    expect(buildRegistry({ playground: replacement }).playground).toBe(replacement);
  });
  it('falls back for each empty list without replacing existing lists', () => {
    const registry = buildRegistry({ missions: [], sidekicks: [], firstWords: ['Brave'], secondWords: [], art: {} });
    expect(registry.firstWords).toEqual(['Brave']);
    expect(registry.secondWords.length).toBeGreaterThanOrEqual(8);
    expect(registry.sidekicks).toHaveLength(3);
    expect(buildRegistry().sidekicks.length).toBeGreaterThan(0);
  });
  it('sorts valid missions without changing the source', () => {
    const high = [23, 24, 31, 32, 47].map((bit) => ({ ...login, id: `bit${bit}`, bit, order: bit }));
    const missions = [dependent, { ...login, bit: -1 }, client, login,
      ...high, { ...login, bit: 48 }, { ...login, bit: 1.5 }];
    expect(buildRegistry({ missions }).missions).toEqual([login, client, dependent, ...high]);
    expect(missions[0]).toBe(dependent);
  });
});

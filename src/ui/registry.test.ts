import { describe, expect, it } from 'vitest';
import { buildRegistry } from './registry';
import { client, dependent, login } from './test/fixtures';
describe('content registry', () => {
  it('falls back for each empty list without replacing existing lists', () => {
    const registry = buildRegistry({ missions: [], sidekicks: [], firstWords: ['Brave'], secondWords: [], art: {} });
    expect(registry.firstWords).toEqual(['Brave']);
    expect(registry.secondWords.length).toBeGreaterThanOrEqual(8);
    expect(registry.sidekicks).toHaveLength(3);
    expect(buildRegistry().sidekicks.length).toBeGreaterThan(0);
  });
  it('sorts valid missions without changing the source', () => {
    const missions = [dependent, { ...login, bit: -1 }, client, login, { ...login, bit: 24 }, { ...login, bit: 1.5 }];
    expect(buildRegistry({ missions }).missions).toEqual([login, client, dependent]);
    expect(missions[0]).toBe(dependent);
  });
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { lineKey, lineRole } from './audio-manifest';
import { CODENAME_PREFIX, CODENAME_ROLE, codenameLines, codenameRecordings } from './codename';

describe('codename recordings', () => {
  it('makes three narrator lines with a spoken prefix', () => {
    expect(codenameLines('Turbo', 'Falcon')).toEqual([
      { text: 'Your name:', say: 'Your name is', speaker: 'narrator' },
      { text: 'Turbo', speaker: 'narrator' },
      { text: 'Falcon', speaker: 'narrator' },
    ]);
    expect(CODENAME_ROLE).toBe('narrator');
    expect(CODENAME_PREFIX).toBe('Your name is');
  });

  it('lists the prefix and every trimmed unique word in stable order', () => {
    const first = [' Turbo ', 'Swift', 'Turbo'];
    const second = ['Falcon', ' Swift ', 'Otter', CODENAME_PREFIX];
    const recordings = codenameRecordings(first, second);
    expect(recordings).toEqual(['Your name is', 'Turbo', 'Swift', 'Falcon', 'Otter']
      .map((spoken) => ({ role: 'narrator', spoken })));
    expect(recordings).toHaveLength(1 + new Set(['Turbo', 'Swift', 'Falcon', 'Otter']).size);
    expect(first).toEqual([' Turbo ', 'Swift', 'Turbo']);
    expect(second).toEqual(['Falcon', ' Swift ', 'Otter', CODENAME_PREFIX]);
    expect(codenameRecordings([], [])).toEqual([{ role: CODENAME_ROLE, spoken: CODENAME_PREFIX }]);
  });

  it('uses exactly the playback keys for every word pair in any voice context', () => {
    const first = [' Turbo ', 'Swift'], second = ['Falcon', ' Otter '];
    const keys = codenameRecordings(first, second).map(({ role, spoken }) => `${role}|${spoken}`);
    const matched = new Set<string>();
    for (const ctx of [{ sidekick: 'bit' }, { sidekick: 'hoot', missionId: 'pizza' },
      { sidekick: 'pixel', missionId: null }]) {
      for (const a of first) for (const b of second) {
        for (const line of codenameLines(a, b)) {
          const key = lineKey(line, lineRole(line, ctx));
          expect(keys).toContain(key);
          matched.add(key);
        }
      }
    }
    expect(matched).toEqual(new Set(keys));
  });
});

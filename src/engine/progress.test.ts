// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Mission } from './types';
import {
  CROCKFORD, SCRAMBLE, crc16, decodeSaveCode, encodeSaveCode, normalizeSaveCode,
} from './savecode';
import {
  RANKS, SCHEMA_VERSION, STORAGE_KEY, applySaveCode, badgesEarned, checkPin,
  completeMission, createProgress, hashPin, hasIdentity, isUnlocked, loadProgress,
  rank, reconcileExtraBits, recordHint, saveProgress, setCurrent, setIdentity, setPin, toSaveCode,
  updateSettings, type Progress, type StorageLike,
} from './progress';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

class ThrowingStorage implements StorageLike {
  getItem(): never { throw new Error('Storage unavailable'); }
  setItem(): never { throw new Error('Storage unavailable'); }
  removeItem(): never { throw new Error('Storage unavailable'); }
}

const now = new Date('2026-11-07T15:00:00.000Z');
const earlier = '2026-11-01T10:00:00.000Z';
const identity = { firstWord: 63, secondWord: 42, sidekick: 3 };

function mission(id: string, bit: number, order = bit, requires: string[] = []): Mission {
  return {
    id, bit, order, requires, chapter: 'bootcamp', title: 'Try this', blurb: 'Try this.',
    minutes: 1, badge: { id: `${id}-badge`, name: 'Good work', art: 'star' },
    intro: [], steps: [], outro: [],
  };
}

const missions: readonly Mission[] = Object.freeze([
  mission('last', 23, 3), mission('first', 0, 1), mission('middle', 5, 2, ['first']),
]);

function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach((child: unknown) => freeze(child));
    Object.freeze(value);
  }
  return value;
}

function loadValue(value: unknown): Progress {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(value));
  return loadProgress(storage);
}

function populated(): Progress {
  return {
    ...setIdentity(createProgress(), identity), completed: { first: earlier },
    extraBits: 1 << 22, current: { missionId: 'middle', stepId: 'step' },
    hints: { middle: { step: { rung: 2, count: 3 } } },
    settings: { autoRead: false, muted: true, sessionMinutes: 15 },
    pin: { salt: 'aa', hash: 'bb' },
  };
}

describe('progress storage', () => {
  it('creates independent defaults', () => {
    const p = createProgress();
    expect(STORAGE_KEY).toBe('hax.v1');
    expect(SCHEMA_VERSION).toBe(1);
    expect(p).toEqual({
      schema: 1, firstWord: null, secondWord: null, sidekick: null,
      completed: {}, extraBits: 0, current: null, hints: {},
      settings: { autoRead: true, muted: false, sessionMinutes: 0 }, pin: null,
    });
    const other = freeze(createProgress());
    p.completed.first = earlier;
    p.hints.first = { step: { rung: 1, count: 1 } };
    p.settings.muted = true;
    expect(other).toEqual(createProgress());
  });

  it('handles missing storage, missing keys, and throwing storage', () => {
    for (const storage of [null, undefined, new MemoryStorage(), new ThrowingStorage()]) {
      expect(loadProgress(storage)).toEqual(createProgress());
    }
    for (const storage of [null, undefined, new ThrowingStorage()]) {
      expect(saveProgress(storage, freeze(populated()))).toBe(false);
    }
  });

  it('writes and loads all fields under the storage key without mutation', () => {
    const storage = new MemoryStorage();
    const p = freeze(populated());
    expect(saveProgress(storage, p)).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(p));
    expect(loadProgress(storage)).toEqual(p);
    storage.removeItem(STORAGE_KEY);
    expect(loadProgress(storage)).toEqual(createProgress());
  });

  it('returns defaults for invalid JSON and invalid root shapes', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{garbage');
    expect(loadProgress(storage)).toEqual(createProgress());
    for (const value of [null, [], [createProgress()], 1, true, 'text', {},
      { ...populated(), schema: 2 }, { ...populated(), schema: '1' }]) {
      expect(loadValue(value)).toEqual(createProgress());
    }
    expect(loadValue({ schema: 1 })).toEqual(createProgress());
  });

  it('preserves valid partial fields and repairs invalid nested fields independently', () => {
    expect(loadValue({
      schema: 1, firstWord: 0, secondWord: 64, sidekick: 3, extraBits: 0xffffff,
      completed: { good: earlier, bad: 'yesterday', number: 42 },
      current: { missionId: 'first', stepId: null, unwanted: true },
      hints: { first: { good: { rung: 3, count: 4 }, bad: { rung: 0, count: 1 } }, bad: [] },
      settings: { autoRead: false, muted: 'yes', sessionMinutes: 20 },
      pin: { salt: 'AABB', hash: 'ccdd' },
    })).toEqual({
      ...createProgress(), firstWord: 0, sidekick: 3, extraBits: 0xffffff,
      completed: { good: earlier }, current: { missionId: 'first', stepId: null },
      hints: { first: { good: { rung: 3, count: 4 } } },
      settings: { autoRead: false, muted: false, sessionMinutes: 20 },
      pin: { salt: 'AABB', hash: 'ccdd' },
    });
  });

  it('rejects out of range, fractional, and wrongly typed numeric fields', () => {
    for (const [field, maximum] of [
      ['firstWord', 63], ['secondWord', 63], ['sidekick', 3], ['extraBits', 0xffffff],
    ] as const) {
      for (const bad of [-1, maximum + 1, 1.5, '1', true, {}, []]) {
        const expected = { ...populated(), [field]: field === 'extraBits' ? 0 : null };
        expect(loadValue({ ...populated(), [field]: bad })).toEqual(expected);
      }
      for (const good of [0, maximum]) {
        expect(loadValue({ schema: 1, [field]: good })[field]).toBe(good);
      }
    }
  });

  it('repairs each malformed container without discarding valid identity', () => {
    for (const bad of [null, [], 42, 'bad', true]) {
      expect(loadValue({
        schema: 1, ...identity, completed: bad, hints: bad, current: bad,
        settings: bad, pin: bad,
      })).toEqual(setIdentity(createProgress(), identity));
    }
  });

  it('drops invalid dates per entry and retains ISO timestamps', () => {
    const valid = [earlier, '2024-02-29T12:00:00Z', '2026-11-01T12:00:00+02:00'];
    const invalid = ['2026-02-30T12:00:00.000Z', '2026-13-01T00:00:00Z',
      '2026-11-01', 'November 1, 2026', '2026-11-01T99:00:00Z', '', null, {}, []];
    for (const date of invalid) {
      expect(loadValue({ schema: 1, completed: { good: earlier, bad: date } }).completed)
        .toEqual({ good: earlier });
    }
    for (const date of valid) {
      expect(loadValue({ schema: 1, completed: { first: date } }).completed.first).toBe(date);
    }
  });

  it('validates resume points, hint rungs and counts, settings, and hex PIN fields', () => {
    for (const current of [{}, { missionId: 1, stepId: null },
      { missionId: 'first' }, { missionId: 'first', stepId: false }]) {
      expect(loadValue({ schema: 1, current }).current).toBeNull();
    }
    for (const hint of [null, [], {}, { rung: 4, count: 1 }, { rung: 1.5, count: 1 },
      { rung: 1, count: 0 }, { rung: 1, count: -1 }, { rung: 1, count: 1.5 },
      { rung: '1', count: 1 }, { rung: 1, count: '1' }]) {
      expect(loadValue({ schema: 1, hints: { first: { bad: hint } } }).hints)
        .toEqual({ first: {} });
    }
    for (const pin of [{}, { salt: '', hash: 'aa' },
      { salt: 'aa', hash: 'oops' }, { salt: 42, hash: 'aa' }, { salt: 'aa', hash: null }]) {
      expect(loadValue({ schema: 1, pin }).pin).toBeNull();
    }
    expect(loadValue({ schema: 1, pin: { salt: 'abc', hash: 'def' } }).pin)
      .toEqual({ salt: 'abc', hash: 'def' });
    for (const sessionMinutes of [-1, 1.5, '15', null]) {
      expect(loadValue({ schema: 1, settings: { muted: true, sessionMinutes } }).settings)
        .toEqual({ autoRead: true, muted: true, sessionMinutes: 0 });
    }
    expect(loadValue(populated()).current).toEqual(populated().current);
  });
});

describe('pure progress updates', () => {
  it('sets identity and requires all three valid choices, including zero', () => {
    const p = freeze(createProgress());
    expect(hasIdentity(p)).toBe(false);
    const next = setIdentity(p, identity);
    expect(next).not.toBe(p);
    expect(next).toEqual({ ...p, ...identity });
    expect(hasIdentity(next)).toBe(true);
    expect(hasIdentity(setIdentity(p, { firstWord: 0, secondWord: 0, sidekick: 0 }))).toBe(true);
    for (const field of ['firstWord', 'secondWord', 'sidekick'] as const) {
      expect(hasIdentity({ ...next, [field]: null })).toBe(false);
      expect(hasIdentity(setIdentity(p, { ...identity, [field]: -1 }))).toBe(false);
    }
    expect(p).toEqual(createProgress());
  });

  it('keeps the first completion and clears only its own resume point', () => {
    const p = freeze(populated());
    const repeated = completeMission(p, 'first', now);
    expect(repeated).not.toBe(p);
    expect(repeated).toEqual(p);
    const next = completeMission(p, 'middle', now);
    expect(next.completed).toEqual({ first: earlier, middle: now.toISOString() });
    expect(next.current).toBeNull();
    expect(p.completed).toEqual({ first: earlier });
    expect(p.current).toEqual({ missionId: 'middle', stepId: 'step' });
  });

  it('sets, copies, and clears a resume point without changing its input', () => {
    const p = freeze(populated());
    const point = { missionId: 'last', stepId: null };
    const next = setCurrent(p, point);
    expect(next).not.toBe(p);
    expect(next.current).toEqual(point);
    point.missionId = 'first';
    expect(next.current?.missionId).toBe('last');
    expect(setCurrent(p, null)).toEqual({ ...p, current: null });
    expect(p.current?.missionId).toBe('middle');
  });

  it('clamps hints, keeps the highest rung, and counts each press independently', () => {
    const p = freeze(populated());
    const low = recordHint(p, 'middle', 'step', -10);
    expect(low).not.toBe(p);
    expect(low.hints.middle?.step).toEqual({ rung: 2, count: 4 });
    const high = freeze(recordHint(low, 'middle', 'step', 99));
    expect(recordHint(high, 'middle', 'step', 1).hints.middle?.step)
      .toEqual({ rung: 3, count: 6 });
    expect(recordHint(p, 'new', 'first', 0).hints.new?.first).toEqual({ rung: 1, count: 1 });
    expect(recordHint(p, 'middle', 'other', 3).hints.middle)
      .toEqual({ step: { rung: 2, count: 3 }, other: { rung: 3, count: 1 } });
    expect(p).toEqual(populated());
  });

  it('patches each setting and preserves unrelated fields', () => {
    const p = freeze(populated());
    for (const patch of [{ autoRead: true }, { muted: false }, { sessionMinutes: 0 }, {}]) {
      const next = updateSettings(p, patch);
      expect(next).not.toBe(p);
      expect(next.settings).not.toBe(p.settings);
      expect(next).toEqual({ ...p, settings: { ...p.settings, ...patch } });
    }
    expect(p).toEqual(populated());
  });

  it('requires every prerequisite and returns badges in mission order', () => {
    const p = freeze(populated());
    expect(isUnlocked(p, mission('open', 1))).toBe(true);
    expect(isUnlocked(p, mission('ready', 1, 1, ['first']))).toBe(true);
    expect(isUnlocked(p, mission('locked', 1, 1, ['first', 'middle']))).toBe(false);
    const done = freeze(completeMission(p, 'last', now));
    expect(badgesEarned(done, missions)).toEqual([missions[1]!.badge, missions[0]!.badge]);
    expect(badgesEarned(createProgress(), missions)).toEqual([]);
    expect(missions.map((item) => item.id)).toEqual(['last', 'first', 'middle']);
  });

  it('treats prototype-looking mission and step ids as ordinary own keys', () => {
    const p = freeze(createProgress());
    expect(isUnlocked(p, mission('locked', 1, 1, ['toString']))).toBe(false);
    expect(badgesEarned(p, [mission('toString', 1)])).toEqual([]);
    const next = completeMission(p, '__proto__', now);
    expect(Object.hasOwn(next.completed, '__proto__')).toBe(true);
    expect(isUnlocked(next, mission('ready', 1, 1, ['__proto__']))).toBe(true);
    const hinted = recordHint(p, '__proto__', 'constructor', 2);
    expect(hinted.hints['__proto__']?.constructor).toEqual({ rung: 2, count: 1 });
    expect(loadValue(hinted)).toEqual(hinted);
    expect(p).toEqual(createProgress());
  });

  it.each([
    [-5, 'Recruit'], [0, 'Recruit'], [1, 'Cadet'], [2, 'Cadet'], [5, 'Cadet'],
    [6, 'Agent'], [8, 'Agent'], [9, 'Special Agent'], [11, 'Special Agent'],
    [12, 'Senior Agent'], [15, 'Senior Agent'], [16, 'Chief Agent'], [24, 'Chief Agent'],
  ])('ranks %i completed missions as %s', (count, expected) => {
    expect(rank(count)).toBe(expected);
    expect(RANKS).toEqual(['Recruit', 'Cadet', 'Agent', 'Special Agent', 'Senior Agent', 'Chief Agent']);
  });
});

describe('progress save codes', () => {
  it('converts newly registered extra bits without changing dates or other progress', () => {
    const p = freeze({ ...populated(), extraBits: (1 << 22) | (1 << 23) | (1 << 5) | 1 });
    const next = reconcileExtraBits(p, missions, now);
    expect(next).toEqual({
      ...p, extraBits: 1 << 22, current: null,
      completed: { first: earlier, middle: now.toISOString(), last: now.toISOString() },
    });
    expect(reconcileExtraBits(freeze(next), missions, new Date('2026-12-01T00:00:00Z'))).toEqual(next);
    expect(p.extraBits).toBe((1 << 22) | (1 << 23) | (1 << 5) | 1);
    expect(p.completed).toEqual({ first: earlier });
    expect(p.current).toEqual({ missionId: 'middle', stepId: 'step' });
    expect(reconcileExtraBits(p, [], now)).toEqual(p);
  });

  it('keeps unknown bits and ignores invalid mission bits during reconciliation', () => {
    const p = freeze({ ...createProgress(), extraBits: (1 << 5) | (1 << 23) });
    const registry = [-1, 24, 32, 0.5, Number.NaN, Infinity].map((bit, i) => mission(`bad${i}`, bit));
    expect(reconcileExtraBits(p, registry, now)).toEqual(p);
    expect(reconcileExtraBits(p, [mission('new', 5)], now)).toEqual({
      ...p, extraBits: 1 << 23, completed: { new: now.toISOString() },
    });
  });

  it('round trips identity and completed missions onto fresh progress', () => {
    const source = freeze(completeMission(setIdentity(createProgress(), identity), 'last', now));
    const target = freeze(createProgress());
    const result = applySaveCode(target, toSaveCode(source, missions), missions, now);
    expect(result).toEqual({ ok: true, progress: source });
    expect(target).toEqual(createProgress());
    expect(source.completed).toEqual({ last: now.toISOString() });
  });

  it('encodes null identity as zero and combines known bits with extra bits', () => {
    expect(decodeSaveCode(toSaveCode(createProgress(), missions))).toEqual({
      ok: true, data: { firstWord: 0, secondWord: 0, sidekick: 0, missionBits: 0 },
    });
    const p = freeze(populated());
    expect(decodeSaveCode(toSaveCode(p, missions))).toEqual({
      ok: true, data: { ...identity, missionBits: (1 << 22) | 1 },
    });
  });

  it('retains unknown bits across a partial registry and later restores them', () => {
    const code = encodeSaveCode({ ...identity, missionBits: (1 << 23) | (1 << 5) | 1 });
    const result = applySaveCode(freeze(createProgress()), code, [missions[1]!], now);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected a valid code');
    expect(result.progress.completed).toEqual({ first: now.toISOString() });
    expect(result.progress.extraBits).toBe((1 << 23) | (1 << 5));
    const exported = toSaveCode(freeze(result.progress), [missions[1]!]);
    expect(exported).toBe(code);
    const restored = applySaveCode(createProgress(), exported, missions, now);
    expect(restored).toEqual({
      ok: true, progress: {
        ...setIdentity(createProgress(), identity),
        completed: { first: now.toISOString(), middle: now.toISOString(), last: now.toISOString() },
      },
    });
  });

  it('merges completions, keeps dates and parent data, and clears a completed resume point', () => {
    const p = freeze(populated());
    const newIdentity = { firstWord: 1, secondWord: 2, sidekick: 0 };
    const code = encodeSaveCode({ ...newIdentity, missionBits: (1 << 5) | 1 });
    const result = applySaveCode(p, code, missions, now);
    expect(result).toEqual({
      ok: true, progress: {
        ...p, ...newIdentity, completed: { first: earlier, middle: now.toISOString() },
        current: null,
      },
    });
    const empty = encodeSaveCode({ ...identity, missionBits: 0 });
    expect(applySaveCode(p, empty, missions, now)).toEqual({
      ok: true, progress: p,
    });
    expect(p).toEqual(populated());
  });

  it('retains local unknown completions and recognizes them when the registry grows', () => {
    const p = freeze({ ...createProgress(), extraBits: 1 << 22 });
    const code = encodeSaveCode({ ...identity, missionBits: 1 << 23 });
    const partial = applySaveCode(p, code, [], now);
    expect(partial).toEqual({
      ok: true, progress: { ...p, ...identity, extraBits: (1 << 22) | (1 << 23) },
    });
    const expanded = applySaveCode(p, code, [mission('new', 22)], now);
    expect(expanded).toEqual({
      ok: true, progress: {
        ...p, ...identity, completed: { new: now.toISOString() }, extraBits: 1 << 23,
      },
    });
    expect(p).toEqual({ ...createProgress(), extraBits: 1 << 22 });
  });

  it('ignores invalid mission bits in both conversion directions', () => {
    const registry = [-1, 24, 32, 0.5, Number.NaN, Infinity].map((bit, i) => mission(`bad${i}`, bit));
    const p = freeze(registry.reduce((state, item) => completeMission(state, item.id, now), createProgress()));
    expect(toSaveCode(p, registry)).toBe(toSaveCode(createProgress(), []));
    const code = encodeSaveCode({ ...identity, missionBits: 0xffffff });
    expect(applySaveCode(createProgress(), code, registry, now)).toEqual({
      ok: true, progress: { ...setIdentity(createProgress(), identity), extraBits: 0xffffff },
    });
  });

  it('returns each decoder error without changing local progress', () => {
    const scrambled = (2n << 41n) ^ SCRAMBLE;
    const value = (scrambled << 16n) | BigInt(crc16(scrambled, 44));
    const future = Array.from({ length: 12 }, (_, i) =>
      CROCKFORD[Number((value >> BigInt((11 - i) * 5)) & 31n)]).join('');
    const valid = normalizeSaveCode(toSaveCode(createProgress(), []));
    const damaged = (valid[0] === '0' ? '1' : '0') + valid.slice(1);
    const p = freeze(populated());
    for (const [code, error] of [
      ['', 'wrong-length'], ['?'.repeat(12), 'bad-character'],
      [damaged, 'checksum'], [future, 'unknown-version'],
    ]) {
      expect(applySaveCode(p, code!, missions, now)).toEqual({ ok: false, error });
    }
    expect(p).toEqual(populated());
  });
});

describe('parent PIN', () => {
  it('hashes salt, colon, and PIN using SHA-256', async () => {
    const expected = createHash('sha256').update('aabb:1234').digest('hex');
    expect(await hashPin('1234', 'aabb')).toBe(expected);
    expect(await hashPin('1234', 'aabb')).toMatch(/^[\da-f]{64}$/);
    expect(await hashPin('1234', 'ccdd')).not.toBe(expected);
  });

  it('sets a supplied salt without mutation and checks right, wrong, and absent PINs', async () => {
    const p = freeze(populated());
    const next = freeze(await setPin(p, '1234', 'aabb'));
    expect(next).not.toBe(p);
    expect(next).toEqual({ ...p, pin: { salt: 'aabb', hash: await hashPin('1234', 'aabb') } });
    expect(await checkPin(next, '1234')).toBe(true);
    expect(await checkPin(next, '0000')).toBe(false);
    expect(await checkPin(freeze(createProgress()), '1234')).toBe(false);
    expect(p).toEqual(populated());
    expect(loadValue(next)).toEqual(next);
  });

  it('generates a 16-byte hex salt when omitted', async () => {
    const p = freeze(createProgress());
    const next = freeze(await setPin(p, '2468'));
    expect(next.pin?.salt).toMatch(/^[\da-f]{32}$/);
    expect(next.pin?.hash).toBe(await hashPin('2468', next.pin!.salt));
    expect(await checkPin(next, '2468')).toBe(true);
    expect(await checkPin(next, '2469')).toBe(false);
    expect(p).toEqual(createProgress());
  });
});

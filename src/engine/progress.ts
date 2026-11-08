import type { Badge, Mission, MissionId } from './types';
import { decodeSaveCode, encodeSaveCode, type SaveCodeError } from './savecode';

export const STORAGE_KEY = 'hax.v1';
export const SCHEMA_VERSION = 1;
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export interface Settings { autoRead: boolean; muted: boolean; sessionMinutes: number }
export interface HintUse { rung: number; count: number }
export interface ResumePoint { missionId: MissionId; stepId: string | null }
export interface Progress {
  schema: 1;
  firstWord: number | null;
  secondWord: number | null;
  sidekick: number | null;
  completed: Record<MissionId, string>;
  extraBits: number;
  current: ResumePoint | null;
  hints: Record<MissionId, Record<string, HintUse>>;
  settings: Settings;
  pin: { salt: string; hash: string } | null;
}
export const RANKS: readonly string[] = Object.freeze([
  'Recruit', 'Cadet', 'Agent', 'Special Agent', 'Senior Agent', 'Chief Agent',
]);

export function createProgress(): Progress {
  return {
    schema: SCHEMA_VERSION, firstWord: null, secondWord: null, sidekick: null,
    completed: {}, extraBits: 0, current: null, hints: {},
    settings: { autoRead: true, muted: false, sessionMinutes: 0 }, pin: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inRange(value: unknown, maximum: number, minimum = 0): value is number {
  return typeof value === 'number' && Number.isInteger(value)
    && value >= minimum && value <= maximum;
}

function settingsFrom(value: unknown): Settings {
  const defaults = createProgress().settings;
  if (!isRecord(value)) return defaults;
  return {
    autoRead: typeof value.autoRead === 'boolean' ? value.autoRead : defaults.autoRead,
    muted: typeof value.muted === 'boolean' ? value.muted : defaults.muted,
    sessionMinutes: inRange(value.sessionMinutes, Number.MAX_SAFE_INTEGER)
      ? value.sessionMinutes : defaults.sessionMinutes,
  };
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4}|[+-]\d{6})-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const datePart = value.slice(0, value.indexOf('T'));
  const midnight = new Date(`${datePart}T00:00:00.000Z`);
  return Number.isFinite(midnight.getTime()) && midnight.toISOString().startsWith(datePart);
}

function completedFrom(value: unknown): Progress['completed'] {
  return isRecord(value)
    ? Object.fromEntries(Object.entries(value)
      .filter((entry): entry is [string, string] => isIsoDate(entry[1]))) : {};
}

function currentFrom(value: unknown): ResumePoint | null {
  if (!isRecord(value) || typeof value.missionId !== 'string'
    || (value.stepId !== null && typeof value.stepId !== 'string')) return null;
  return { missionId: value.missionId, stepId: value.stepId };
}

function hintsFrom(value: unknown): Progress['hints'] {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([missionId, steps]) => {
    if (!isRecord(steps)) return [];
    const entries = Object.entries(steps).flatMap(([stepId, hint]) => {
      if (!isRecord(hint) || !inRange(hint.rung, 3, 1)
        || !inRange(hint.count, Number.MAX_SAFE_INTEGER, 1)) return [];
      return [[stepId, { rung: hint.rung, count: hint.count }]];
    });
    return [[missionId, Object.fromEntries(entries)]];
  }));
}

function pinFrom(value: unknown): Progress['pin'] {
  const isHex = (field: unknown): field is string =>
    typeof field === 'string' && /^[\da-f]+$/i.test(field);
  return isRecord(value) && isHex(value.salt) && isHex(value.hash)
    ? { salt: value.salt, hash: value.hash } : null;
}

export function loadProgress(storage: StorageLike | null | undefined): Progress {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return createProgress();
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.schema !== SCHEMA_VERSION) return createProgress();
    return {
      schema: SCHEMA_VERSION,
      firstWord: inRange(value.firstWord, 63) ? value.firstWord : null,
      secondWord: inRange(value.secondWord, 63) ? value.secondWord : null,
      sidekick: inRange(value.sidekick, 3) ? value.sidekick : null,
      completed: completedFrom(value.completed),
      extraBits: inRange(value.extraBits, 0xffffff) ? value.extraBits : 0,
      current: currentFrom(value.current), hints: hintsFrom(value.hints),
      settings: settingsFrom(value.settings), pin: pinFrom(value.pin),
    };
  } catch {
    return createProgress();
  }
}

export function saveProgress(storage: StorageLike | null | undefined, p: Progress): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

export function setIdentity(
  p: Progress, id: { firstWord: number; secondWord: number; sidekick: number },
): Progress {
  return {
    ...p, firstWord: inRange(id.firstWord, 63) ? id.firstWord : null,
    secondWord: inRange(id.secondWord, 63) ? id.secondWord : null,
    sidekick: inRange(id.sidekick, 3) ? id.sidekick : null,
  };
}

export function hasIdentity(p: Progress): boolean {
  return inRange(p.firstWord, 63) && inRange(p.secondWord, 63) && inRange(p.sidekick, 3);
}

export function completeMission(p: Progress, missionId: MissionId, now: Date): Progress {
  return {
    ...p,
    completed: Object.hasOwn(p.completed, missionId)
      ? { ...p.completed } : { ...p.completed, [missionId]: now.toISOString() },
    current: p.current?.missionId === missionId ? null : p.current,
  };
}

export function setCurrent(p: Progress, point: ResumePoint | null): Progress {
  return { ...p, current: point === null ? null : { ...point } };
}

export function recordHint(
  p: Progress, missionId: MissionId, stepId: string, rung: number,
): Progress {
  const steps = Object.hasOwn(p.hints, missionId) ? p.hints[missionId]! : {};
  const previous = Object.hasOwn(steps, stepId) ? steps[stepId] : undefined;
  const clamped = Math.max(1, Math.min(3, Math.trunc(rung) || 1));
  return {
    ...p,
    hints: {
      ...p.hints,
      [missionId]: {
        ...steps, [stepId]: {
          rung: Math.max(previous?.rung ?? 1, clamped), count: (previous?.count ?? 0) + 1,
        },
      },
    },
  };
}

export function updateSettings(p: Progress, patch: Partial<Settings>): Progress {
  return { ...p, settings: settingsFrom({ ...p.settings, ...patch }) };
}

export function isUnlocked(p: Progress, mission: Mission): boolean {
  return mission.requires.every((id) => Object.hasOwn(p.completed, id));
}

export function rank(completedCount: number): string {
  const thresholds = [0, 1, 6, 9, 12, 16];
  for (let index = thresholds.length - 1; index >= 0; index -= 1) {
    if (completedCount >= thresholds[index]!) return RANKS[index]!;
  }
  return RANKS[0]!;
}

export function badgesEarned(p: Progress, missions: readonly Mission[]): Badge[] {
  return missions.filter((mission) => Object.hasOwn(p.completed, mission.id))
    .sort((a, b) => a.order - b.order).map((mission) => mission.badge);
}

export function toSaveCode(p: Progress, missions: readonly Mission[]): string {
  const missionBits = missions.reduce((bits, mission) =>
    inRange(mission.bit, 23) && Object.hasOwn(p.completed, mission.id)
      ? bits | (1 << mission.bit) : bits, p.extraBits);
  return encodeSaveCode({
    missionBits, firstWord: p.firstWord ?? 0,
    secondWord: p.secondWord ?? 0, sidekick: p.sidekick ?? 0,
  });
}

export type ApplyResult = { ok: true; progress: Progress } | { ok: false; error: SaveCodeError };

export function reconcileExtraBits(p: Progress, missions: readonly Mission[], now: Date): Progress {
  let registeredBits = 0;
  let progress = { ...p };
  for (const mission of missions) {
    if (!inRange(mission.bit, 23)) continue;
    const bit = 1 << mission.bit;
    registeredBits |= bit;
    if ((p.extraBits & bit) !== 0) progress = completeMission(progress, mission.id, now);
  }
  return { ...progress, extraBits: p.extraBits & ~registeredBits };
}

export function applySaveCode(
  p: Progress, code: string, missions: readonly Mission[], now: Date,
): ApplyResult {
  const result = decodeSaveCode(code);
  if (!result.ok) return result;
  const { missionBits, firstWord, secondWord, sidekick } = result.data;
  return { ok: true, progress: reconcileExtraBits({
    ...p, firstWord, secondWord, sidekick, extraBits: missionBits | p.extraBits,
  }, missions, now) };
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return hex(new Uint8Array(digest));
}

export async function setPin(p: Progress, pin: string, salt?: string): Promise<Progress> {
  const chosenSalt = salt ?? hex(globalThis.crypto.getRandomValues(new Uint8Array(16)));
  return { ...p, pin: { salt: chosenSalt, hash: await hashPin(pin, chosenSalt) } };
}

export async function checkPin(p: Progress, pin: string): Promise<boolean> {
  return p.pin !== null && await hashPin(pin, p.pin.salt) === p.pin.hash;
}

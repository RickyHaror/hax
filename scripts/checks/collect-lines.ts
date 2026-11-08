import type { Line, Mission } from '../../src/engine/types';

const LINE_KEYS = new Set(['text', 'say', 'speaker']);

/** Every kid-facing Line in a mission, wherever it sits in the data. */
export function collectLines(mission: Mission): Line[] {
  const out: Line[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (typeof obj.text === 'string' && Object.keys(obj).every((k) => LINE_KEYS.has(k))) {
        out.push(obj as unknown as Line);
        return;
      }
      Object.values(obj).forEach(visit);
    }
  };
  visit(mission);
  return out;
}

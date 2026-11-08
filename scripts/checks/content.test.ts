import { describe, expect, it } from 'vitest';
import { missions } from '../../src/missions';
import { collectLines } from './collect-lines';
import { fleschKincaidGrade, lineProblems, MAX_GRADE } from './readability';

describe('mission content', () => {
  it('uses unique ids, bits and orders', () => {
    const ids = missions.map((m) => m.id);
    const bits = missions.map((m) => m.bit);
    const orders = missions.map((m) => m.order);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(bits).size).toBe(bits.length);
    expect(new Set(orders).size).toBe(orders.length);
    for (const b of bits) expect(b >= 0 && b <= 23).toBe(true);
  });

  it('only requires missions that exist', () => {
    const ids = new Set(missions.map((m) => m.id));
    for (const m of missions) for (const r of m.requires) expect(ids.has(r), `${m.id} requires ${r}`).toBe(true);
  });

  it('gives every step a full hint ladder', () => {
    for (const m of missions) for (const s of m.steps) expect(s.hints.length, `${m.id}/${s.id}`).toBe(3);
  });

  it('opens every client mission with a permission slip and ends with a lockdown', () => {
    for (const m of missions.filter((x) => x.chapter === 'missions')) {
      expect(m.client, m.id).toBeDefined();
      expect(m.client!.allowed.length, m.id).toBeGreaterThan(0);
      expect(m.steps.some((s) => s.lockdown), `${m.id} needs a lockdown step`).toBe(true);
    }
  });

  for (const m of missions) {
    it(`${m.id} reads at an early elementary level`, () => {
      const lines = collectLines(m);
      const problems = lines.flatMap((l) => lineProblems(l.text));
      expect(problems, JSON.stringify(problems, null, 2)).toEqual([]);
      expect(fleschKincaidGrade(lines.map((l) => l.text))).toBeLessThanOrEqual(MAX_GRADE);
    });
  }
});

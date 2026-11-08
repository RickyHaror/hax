import { describe, expect, it } from 'vitest';
import { lineProblems } from '../../scripts/checks/readability';
import { sidekicks } from './sidekicks';

describe('sidekicks', () => {
  it('keeps the three names, ids and art keys in save-code order', () => {
    expect(sidekicks.map(({ id, name, art }) => ({ id, name, art }))).toEqual([
      { id: 'bit', name: 'Bit', art: 'sidekick-bit' },
      { id: 'pixel', name: 'Pixel', art: 'sidekick-pixel' },
      { id: 'hoot', name: 'Hoot', art: 'sidekick-hoot' },
    ]);
    expect(new Set(sidekicks.map(({ id }) => id)).size).toBe(3);
  });

  for (const sidekick of sidekicks) {
    it(`${sidekick.name} has a short greeting and goodbye`, () => {
      expect(sidekick.greeting.length).toBeGreaterThanOrEqual(2);
      expect(sidekick.greeting.length).toBeLessThanOrEqual(3);
      expect(sidekick.goodbye.length).toBeGreaterThanOrEqual(1);
      expect(sidekick.goodbye.length).toBeLessThanOrEqual(2);
    });

    it(`${sidekick.name} uses early-reader text in every Line`, () => {
      const lines = [sidekick.personality, ...sidekick.greeting, ...sidekick.goodbye];
      for (const line of lines) {
        expect(line.text.trim()).not.toBe('');
        for (const text of [line.text, line.say].filter((text) => text !== undefined)) {
          expect(lineProblems(text), `${sidekick.id}: ${text}`).toEqual([]);
        }
      }
    });
  }
});

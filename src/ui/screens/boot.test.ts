import { expect, it } from 'vitest';
import { BOOT_LINES } from './boot';
import { lineProblems } from '../../../scripts/checks/readability';

it('boots with simple lines of at most twelve words and explains pretend play', () => {
  expect(BOOT_LINES.length).toBeGreaterThan(0);
  for (const { tag, line } of BOOT_LINES) {
    expect(['OK', 'INFO']).toContain(tag);
    expect(line.text.trim().split(/\s+/).length).toBeLessThanOrEqual(12);
    expect(lineProblems(line.text)).toEqual([]);
  }
  expect(BOOT_LINES.some(({ line }) => line.text === 'It is all pretend here. Nothing real can break.')).toBe(true);
});

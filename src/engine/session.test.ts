import { expect, it } from 'vitest';
import { sessionDue, sessionRemaining } from './session';

it('uses an injected clock, with the exact boundary included', () => {
  const start = 1000;
  let time = start;
  const clock = () => time;
  expect(sessionRemaining(start, 15, clock)).toBe(900_000);
  time += 899_999; expect(sessionDue(start, 15, clock)).toBe(false);
  time++; expect(sessionDue(start, 15, clock)).toBe(true);
  time += 60_000; expect(sessionRemaining(start, 15, clock)).toBe(0);
});

it.each([0, -1, NaN, Infinity])('keeps the timer off for %s minutes', (minutes) => {
  expect(sessionDue(0, minutes, () => 999_999_999)).toBe(false);
  expect(sessionRemaining(0, minutes, () => 999_999_999)).toBe(Infinity);
});

it.each([15, 30, 45, 60])('supports a %s minute session', (minutes) => {
  expect(sessionDue(0, minutes, () => minutes * 60_000 - 1)).toBe(false);
  expect(sessionDue(0, minutes, () => minutes * 60_000)).toBe(true);
});

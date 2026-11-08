export function sessionRemaining(startedAt: number, minutes: number, clock: () => number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return Infinity;
  return Math.max(0, startedAt + minutes * 60_000 - clock());
}

export function sessionDue(startedAt: number, minutes: number, clock: () => number): boolean {
  return sessionRemaining(startedAt, minutes, clock) === 0;
}

import { signal } from '@preact/signals';
import { checkPin, type Progress } from '../../../engine/progress';

export function parentAccess(progress: () => Progress, clock: () => number) {
  const lockedUntil = signal(0);
  let failures = 0;
  let checking = false;
  async function check(pin: string): Promise<'ok' | 'wrong' | 'locked'> {
    if (checking || clock() < lockedUntil.value) return 'locked';
    if (lockedUntil.value) { failures = 0; lockedUntil.value = 0; }
    checking = true;
    try {
      if (await checkPin(progress(), pin)) { failures = 0; return 'ok'; }
      failures++;
      if (failures >= 5) { lockedUntil.value = clock() + 30_000; return 'locked'; }
      return 'wrong';
    } finally { checking = false; }
  }
  return { lockedUntil, check };
}
